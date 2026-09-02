// 병합 후 배포 확인 + 실브라우저 검사 — **한 명령으로** (4차 F-5 병합 준비).
//
// 1~3차 병합에서 매번 손으로 `curl` 을 쳤고, 그때마다 **위양성을 두 번 냈다**
//   (별칭이 옛 배포를 서빙하는데 새 배포로 읽었다). 그래서 순서를 코드로 고정한다:
//   **배포 신원이 기대 커밋과 같아진 뒤에야 검사를 잰다.**
//
// **기다림에는 끝이 있어야 하고, 끝났는지 확인할 수 있어야 한다**(`CLAUDE.md` §11).
//   폴링에 **상한**이 있고(`DEPLOY_WAIT_MS`), 넘기면 **시끄럽게 실패**한다 — 조용히 검사로 넘어가지 않는다.
//
// ─────────────────────────────────────────────────────────────────────────────
// **규율: 적히는 모든 값은 둘 중 하나다** — 따라가야 하는 값이거나, 얼어야 하는 값이거나.
//   (`CLAUDE.md` §11)
//
//   **기대 커밋은 따라가야 하는 값인데 여태 손으로 박고 있었다.** 절차서 해시 건에서
//   *고정 해시는 push 할 때마다 낡는다* 는 규율을 세워 놓고 **이 도구에는 적용하지 않았다** —
//   규율이 문서에만 살고 도구에 내려오지 않은 채로 한 회차를 더 돌았다.
//
//   실제로 값을 냈다(2026-08-30): `main` 이 이미 `71fa30c` 인데 낡은 인수를 그대로 넘겨
//   *배포 신원 불일치* 로 읽었다. **사고가 아니라 인수 착오였고, 배포는 멀쩡했다** —
//   그러나 도구가 낸 것은 "틀렸다"는 신호였고 그 신호를 쫓는 데 시간을 썼다.
//
//   → **인수를 지우고 얻는 방법을 적는다.** 기대 커밋은 `git ls-remote origin main` 에서 뽑는다.
//     손으로 넘기고 싶으면 여전히 넘길 수 있으나(핫픽스·프리뷰), **기본값은 조회다.**
// ─────────────────────────────────────────────────────────────────────────────
//
// 사용:
//   node scripts/postdeploy.mjs [기대 커밋] [기준 URL]
//   예) node scripts/postdeploy.mjs                      # 기대 커밋 = origin/main 조회값
//       node scripts/postdeploy.mjs 1bb05f3              # 손으로 지정(예외)
//
// **자격을 쓰지 않는다** — 전부 비인증으로 재는 것들이다(게이트 확인 포함).
import { setTimeout as sleep } from 'node:timers/promises';
import { execFileSync } from 'node:child_process';

/**
 * 기대 커밋 — **원격에서 얻는다.** 로컬 `git log` 를 보지 않는 이유는 `CLAUDE.md` §11 과 같다:
 *   로컬 해시는 push 의 증거가 아니다. **배포가 서빙할 것은 원격이 들고 있는 것**이다.
 * 브랜치를 인수로 받지 않는다 — 이 도구는 **운영 배포 확인용**이고 운영은 `main` 하나다.
 */
function wantFromRemote() {
  const out = execFileSync('git', ['ls-remote', 'origin', 'main'], { encoding: 'utf8' }).trim();
  const sha = out.split(/\s+/)[0];
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`origin/main 해시를 읽지 못했다: ${JSON.stringify(out)}`);
  return sha.slice(0, 7); // `/api/version` 의 commitShort 와 같은 자릿수(route.ts 가 slice(0,7))
}

const ARG = process.argv[2];
const BASE = process.argv[3] ?? 'https://future.yebom.org';
let WANT;
try {
  WANT = ARG ?? wantFromRemote();
  if (!ARG) console.log(`[기대 커밋] git ls-remote origin main → ${WANT}`);
  else console.log(`[기대 커밋] 손으로 지정 → ${WANT}  (기본은 origin/main 조회다)`);
} catch (e) {
  console.error(`X 기대 커밋을 얻지 못했다: ${e.message}`);
  process.exit(2);
}
const WAIT_MS = Number(process.env.DEPLOY_WAIT_MS ?? 10 * 60 * 1000); // 상한 10분
const POLL_MS = Number(process.env.DEPLOY_POLL_MS ?? 10_000);

const fails = [];
const ok = (label, detail) => console.log(`  O ${label.padEnd(28)} ${detail}`);
const bad = (label, detail) => { console.error(`  X ${label.padEnd(28)} ${detail}`); fails.push(label); };

/** ① 배포 신원 — **기대 커밋이 설 때까지**. 상한을 넘기면 실패로 끝낸다. */
async function waitDeploy() {
  console.log("");
  console.log(`[배포 확인] ${BASE} 가 ${WANT} 를 서빙할 때까지 (상한 ${Math.round(WAIT_MS / 60000)}분)`);
  const until = Date.now() + WAIT_MS;
  let last = null;
  while (Date.now() < until) {
    try {
      const v = await (await fetch(`${BASE}/api/version`, { cache: 'no-store' })).json();
      last = v;
      if (v.commitShort === WANT) {
        ok('배포 신원', `${v.commitShort} · ref=${v.ref} · env=${v.env} · ${v.deploymentId}`);
        return true;
      }
    } catch { /* 배포 교체 중에는 잠깐 실패한다 — 상한 안에서 다시 본다 */ }
    await sleep(POLL_MS);
  }
  bad('배포 신원', `상한 안에 ${WANT} 가 서지 않았다 (마지막: ${last?.commitShort ?? '응답 없음'})`);
  return false;
}

const get = async (path, redirect = 'manual') =>
  fetch(`${BASE}${path}`, { redirect, cache: 'no-store', headers: { 'user-agent': 'postdeploy-check' } });

/** 실브라우저 검사. **HTTP 200 을 통과로 보지 않는다**(불변식 19) — 본문을 본다. */
async function checks() {
  console.log("");
  console.log('[실브라우저 검사]');

  // 1 · 공개 현관
  {
    const r = await get('/');
    const html = await r.text();
    const hit = ['site-gnb', 'site-hero', 'site-weeks', 'site-foot'].filter((k) => html.includes(k));
    if (r.status === 200 && hit.length === 4) ok('/ 공개 현관', `200 · ${(html.length / 1024).toFixed(0)}KB · 부품 4/4`);
    else bad('/ 공개 현관', `${r.status} · 부품 ${hit.length}/4`);
  }

  // 2 · 소개 — 원고 반영과 골드 위계
  {
    const r = await get('/about');
    const html = await r.text();
    const need = ['site-leader', 'site-book', 'kyobobook', 'ui-btn--ghost'];
    const hit = need.filter((k) => html.includes(k));
    if (r.status === 200 && hit.length === need.length) ok('/about 소개', `200 · 원고 부품 ${hit.length}/${need.length} · 구매 ghost`);
    else bad('/about 소개', `${r.status} · ${hit.length}/${need.length} (빠짐: ${need.filter((k) => !html.includes(k)).join(', ')})`);
  }

  // 3 · 모집 — **ISR 무손상**이 이 줄의 요점이다
  {
    const r = await get('/recruit');
    const cache = r.headers.get('x-vercel-cache') ?? '?';
    const html = await r.text();
    if (r.status === 200 && /PRERENDER|HIT|STALE/i.test(cache)) ok('/recruit ISR', `200 · x-vercel-cache=${cache} · ${(html.length / 1024).toFixed(0)}KB`);
    else bad('/recruit ISR', `${r.status} · x-vercel-cache=${cache} — 정적 캐시가 아니면 ISR 이 깨진 것이다`);
  }

  // 4 · 코드 딥링크. **초기 HTML 은 로딩 셸이다** — 200 만으로 판정하지 않고 그 사실을 적는다.
  {
    const r = await get('/join?code=ZR4KB');
    const html = await r.text();
    const shell = html.includes('불러오는 중');
    if (r.status === 200) ok('/join?code= 딥링크', `200 · ${(html.length / 1024).toFixed(0)}KB${shell ? ' · 로딩 셸(차수 미리보기는 하이드레이션 후 — 실브라우저로 눈 확인 필요)' : ''}`);
    else bad('/join?code= 딥링크', `${r.status}`);
  }

  // 4-2 · ★ **딥링크 재호출 상한**(지휘부 채택 2026-08-29 — 이번 사고를 이 자리가 못 잡았다).
  //   위 4번은 200 과 크기만 본다. 그런데 2026-08-29 의 사고는 **200 을 내면서 무한히 다시 부르는** 것이었다 —
  //   껍데기가 트리 모양을 바꿔 본문을 재마운트했고, 서버 액션 POST 가 초당 6.9회 나갔다.
  //   **판정의 근거가 판정하려는 것보다 좁았다.** 그래서 여기서는 **횟수를 센다.**
  //   실브라우저가 필요하므로 `playwright`(devDependency)를 쓴다. 실패해도 자격은 쓰지 않는다.
  {
    const LIMIT = 3, WINDOW_MS = 6000;
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch();
      const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
      const page = await ctx.newPage();
      let posts = 0;
      page.on('request', (q) => { if (q.method() === 'POST' && q.url().includes('/join')) posts++; });
      await page.goto(`${BASE}/join?code=ZR4KB`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(WINDOW_MS);
      const body = await page.evaluate(() => document.body.innerText || '');
      const stuck = body.includes('불러오는 중');
      await browser.close();
      const detail = `POST ${posts}회 / ${WINDOW_MS / 1000}초${stuck ? ' · ★ 아직 로딩' : ''}`;
      if (posts <= LIMIT && !stuck) ok('/join?code= 재호출 상한', `${detail} (상한 ${LIMIT})`);
      else bad('/join?code= 재호출 상한', `${detail} — 상한 ${LIMIT} 초과이거나 화면이 안 넘어간다`);
    } catch (e) {
      // 도구가 없으면 **조용히 넘어가지 않는다** — 못 잰 것과 통과는 다르다.
      bad('/join?code= 재호출 상한', `재지 못했다: ${String(e).slice(0, 60)}`);
    }
  }

  // 5-2 · ★★ **로그인 착지 — 여러 경로를 재고 상한을 둔다**(ADR-175·176).
  //   ★ **정적 검사로는 잡힐 수 없다** — 「프리페치 캐시를 쓰는가」·「몇 초 걸리는가」는
  //   둘 다 **런타임 행동**이다(⑨-c). 그리고 **한 경로만 재면 창이 좁다**(⑨-a):
  //   ADR-175 의 결함은 벨트에 링크가 있는 화면 하나에만 났고 `/feed` 는 멀쩡했다 —
  //   한 줄만 봤으면 「괜찮다」로 읽혔다. 그래서 **성질이 다른 셋**을 잰다:
  //     ⑴ 벨트가 프리페치하는 보호 화면(ADR-175 가 난 자리)
  //     ⑵ 벨트에 없는 보호 화면(대조군 — 여기가 느려지면 원인이 다른 것이다)
  //     ⑶ 착지를 서버에 묻는 홈 경로(왕복이 하나 더 붙는 유일한 갈래)
  //   자격이 없으면 **통과가 아니라 실패**로 적는다 — 못 잰 것과 통과는 다르다.
  {
    const LIMIT_MS = 8000;   // 상한. 실측 중앙 0.9초 · 최지연 1.4초(2026-09-02)에서 넉넉히 잡았다.
    const CASES = [
      ['/home/assessments', '벨트가 프리페치하는 자리'],
      ['/feed', '벨트에 없는 대조군'],
      [null, '홈 착지(서버에 묻는 갈래)'],
    ];
    try {
      const { readFileSync } = await import('node:fs');
      const env = readFileSync('.env.local', 'utf8');
      const pick = (k) => ((env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1] || '').trim();
      const mail = pick('QA_USER_EMAIL'), pw = pick('QA_USER_PASSWORD');
      if (!mail || !pw) throw new Error('.env.local 에 QA_USER_EMAIL/PASSWORD 가 없다');
      const { chromium } = await import('playwright');
      const browser = await chromium.launch();
      const rows = [];
      for (const [target, why] of CASES) {
        const page = await (await browser.newContext()).newPage();
        const url = `${BASE}/login${target ? `?returnTo=${encodeURIComponent(target)}` : ''}`;
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        // 벨트 링크가 살아야 프리페치가 난다 — **물 것을 먼저 세운다**(계열 ⑧).
        await page.waitForSelector('.site-gnb__nav a', { timeout: 15000 });
        await page.getByLabel(/이메일/).fill(mail);
        await page.getByLabel(/비밀번호/).fill(pw);
        const t0 = Date.now();
        await page.getByRole('button', { name: /로그인/ }).click();
        let ms = null;
        try {
          // 기다림은 조건으로 끝나고 상한이 있고 넘기면 시끄럽게 실패한다(§11).
          await page.waitForFunction(
            (t) => !location.pathname.startsWith('/login')
              && (t === null || location.pathname === t)
              && !(document.body.innerText || '').includes('불러오는 중'),
            target, { timeout: LIMIT_MS });
          ms = Date.now() - t0;
        } catch { /* 못 간 것은 아래에서 붉게 적는다 */ }
        const url2 = await page.evaluate(() => location.pathname + location.search);
        rows.push({ target: target ?? '(없음·홈)', why, ms, url2 });
        await page.close();
      }
      await browser.close();
      const slow = rows.filter((r) => r.ms === null);
      const detail = rows.map((r) => `${r.target} ${r.ms === null ? '못감' : (r.ms / 1000).toFixed(1) + 's'}`).join(' · ');
      if (slow.length === 0) ok('로그인 착지 3경로', `${detail} (상한 ${LIMIT_MS / 1000}초)`);
      else bad('로그인 착지 3경로', `${detail} — 못 간 것: ${slow.map((r) => `${r.target}(${r.why}) 끝 URL ${r.url2}`).join(', ')}`);
    } catch (e) {
      bad('로그인 착지 3경로', `재지 못했다: ${String(e).slice(0, 70)}`);
    }
  }

  // 5 · 게이트 화면 — **200 을 통과로 보지 않는다**(불변식 19)
  {
    const r = await get('/feed');
    const loc = r.headers.get('location') ?? '';
    const body = await r.text();
    const leak = /feed-post|site-feed|피드/.test(body);
    if (r.status === 307 && loc.includes('/login') && !leak) ok('/feed 미인증 게이트', `307 → ${loc} · 본문 ${body.length}B · 누출 0`);
    else bad('/feed 미인증 게이트', `${r.status} · loc=${loc || '없음'} · 누출 ${leak ? '있음' : '0'}`);
  }
}

const deployed = await waitDeploy();
if (deployed) await checks();

console.log("");
if (fails.length) {
  console.error(`X 실패 ${fails.length}건: ${fails.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('O 배포 확인 + 실브라우저 검사 전항 통과');
}
