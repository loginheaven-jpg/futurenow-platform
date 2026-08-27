// 4폭 캡처 하네스 — **전 화면 하나로** (4차 F-1 신설 · F-5 준비에서 통합).
//
// 폭은 개요 §2 의 넷(1280·1024·768·390)이고 `screens.mjs` 가 화면 목록의 **단일 출처**다.
//
// 모드 넷:
//   `public`  — 비인증 실라우트. 서버를 띄워 진짜 화면을 찍는다
//   `fixture` — 인증 뒤 화면의 **표시 층을 SSR 로** 그려 찍는다(QA 계정 전의 대역)
//   `auth`    — 인증 뒤 **실라우트**. `.env.local` 의 QA 자격으로 로그인해 찍는다
//   `all`     — public + fixture
//
// **`fixture` 를 "브라우저에서 확인했다"로 적지 않는다.** 같은 부품·같은 조립을 실제 CSS 로
//   그린 것이고 다른 것은 상호작용뿐이다(그것은 `sheetKeys` 등 단위테스트가 전수한다).
//
// **`playwright` 는 devDependency 다**(버전 고정 · 지휘부 승인 2026-08-28).
//   런타임 코드가 이것을 수입하지 않음을 `tests/devDeps.guard.test.ts` 가 잠근다.
//   쿠키를 손으로 합성하는 길을 택하지 않은 이유: **Supabase 쿠키 형식에 결합된 자가제작 우회라
//   형식이 바뀌면 조용히 깨진다** — 이 하네스가 방금 겪은 함정을 다시 심는 일이다.
//
// ─────────────────────────────────────────────────────────────────────────────
// **규율: 기다림에는 끝이 있어야 하고, 끝났는지 확인할 수 있어야 한다.**
//   (지휘부 승격 2026-08-28 · `CLAUDE.md` §11)
//
//   고정 대기(`setTimeout`)를 쓰지 않는다 — *"2.5초면 되겠지"* 는 추측이고 느린 화면에서
//   여전히 로딩 셸을 찍는다. 그렇다고 **상한 없이 기다리면 멈춘다.** 둘 다 겪었다.
//   지금은 **로드 상태**를 기다리되 **모든 대기에 상한**이 있고, 넘기면 **시끄럽게 실패**한다.
//
// **이 스택 고유의 함정 셋** — 실측으로 얻었다. 지우지 말 것:
//
//   ① **`networkidle` 은 아예 안 잡힌다.** Next 가 RSC 프리페치로 연결을 계속 여닫는다.
//      주 신호로 삼으면 화면마다 상한을 헛되이 태운다(실측: 44장에 11분을 태우고 미완).
//      → 주 신호는 `load`, `networkidle` 은 **보조**(`IDLE_MS`).
//
//   ② **숨겨진 lazy 이미지는 영영 로드되지 않는다.** `display:none` + `loading="lazy"` 면
//      `img.complete` 가 끝내 `false` 다(`/recruit` 카드가 lg 미만에서 그렇다).
//      → 이미지 대기에 상한(`IMG_MS`). 상한이 없으면 여기서 멈춘다.
//
//   ③ **`position: fixed` + 긴 full-page 캡처는 안 끝날 수 있다.** `/recruit` 이 5,947px 인데
//      하단 고정 바가 있어 캡처가 안정될 때까지 늘어졌다.
//      → 캡처 자체에 상한(`SHOT_MS`) + `animations: 'disabled'`.
//
//   ④(모양은 다르나 뿌리는 같다) **눌러야 보이는 화면**은 URL 이 같아 조용히 다른 것을 찍는다.
//      시트가 `/home` 과 같은 주소라 홈을 두 번 찍고 있었다 → `open` 슬롯 + 실패 기록.
//
//   넷 다 *"찍히기는 했는데 다른 것을 찍었다"* 는 한 모양이다.
//   **측정 도구를 먼저 측정한다.**
// ─────────────────────────────────────────────────────────────────────────────
//
// 사용:
//   node scripts/shots.mjs public  <출력>     # 서버가 떠 있어야 한다(SHOT_BASE 기본 :3100)
//   node scripts/shots.mjs fixture <출력>
//   node scripts/shots.mjs auth    <출력>     # + .env.local 의 QA_* 자격 · SHOT_COHORT
//   node scripts/shots.mjs all     <출력>
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { WIDTHS, PUBLIC_SCREENS, AUTH_SCREENS, FIXTURE_FILES } from './screens.mjs';

const MODE = process.argv[2];
const OUT = process.argv[3];
const BASE = process.env.SHOT_BASE ?? 'http://localhost:3100';
/** 네트워크 잠잠 **보조** 대기 상한(ms). 주 신호는 `load` 이고 이것은 덤이다. */
const IDLE_MS = Number(process.env.SHOT_IDLE_MS ?? 1200);
/** 이미지 대기 상한(ms). 숨겨진 lazy 이미지는 영영 안 붙으므로 반드시 상한이 있어야 한다. */
const IMG_MS = Number(process.env.SHOT_IMG_MS ?? 1500);
/** 한 장 캡처 상한(ms). **걸리면 조용히 멈추지 말고 시끄럽게 실패한다.** */
const SHOT_MS = Number(process.env.SHOT_TIMEOUT_MS ?? 30_000);

if (!['public', 'fixture', 'auth', 'all'].includes(MODE) || !OUT) {
  console.error('사용법: node scripts/shots.mjs <public|fixture|auth|all> <출력 디렉터리>');
  process.exit(2);
}

const dir = (g) => `${OUT}/${g}`;
mkdirSync(OUT, { recursive: true });

/** `.env.local` 을 읽는다. **값을 출력하지 않는다** — 자격은 로그에도 남기지 않는다(발주 §0.3). */
function env() {
  if (!existsSync('.env.local')) return {};
  return Object.fromEntries(
    readFileSync('.env.local', 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  );
}

/**
 * **로드가 끝났는지 기다린다** — 고정 시간이 아니다.
 *
 * `networkidle` 만으로는 모자란 적이 있다(폰트가 늦게 붙어 글자 폭이 바뀐다).
 * 그래서 문서 준비 → 네트워크 잠잠 → 폰트 → 이미지 순으로 확인한다.
 * 그래도 안 끝나면 **조용히 넘어가지 않고** 그 화면 이름과 함께 알린다.
 */
async function settle(page, label) {
  // **주 신호는 `load` 다.** Next 는 RSC 프리페치로 연결을 계속 여닫아
  //   `networkidle` 이 아예 안 잡히는 화면이 있다 — 그것을 주 신호로 삼으면
  //   화면마다 상한만큼 헛되이 기다린다(실측: 44장에 11분을 태웠다).
  await page.waitForLoadState('load');
  // 보조로만 짧게 본다. 못 잡아도 정상이므로 **경고하지 않는다.**
  await page.waitForLoadState('networkidle', { timeout: IDLE_MS }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  // 이미지가 붙어야 레이아웃이 정해진다. **다만 상한을 건다** —
  //   `loading="lazy"` 이면서 `display:none` 인 이미지는 **영영 로드되지 않는다**
  //   (`/recruit` 의 카드가 lg 미만에서 그렇다). 상한이 없으면 여기서 멈춘다.
  await page
    .evaluate(
      (ms) =>
        Promise.race([
          Promise.all(
            [...document.images]
              .filter((i) => !i.complete)
              .map((i) => new Promise((r) => { i.onload = i.onerror = r; })),
          ),
          new Promise((r) => setTimeout(r, ms)),
        ]),
      IMG_MS,
    )
    .catch(() => console.warn(`    ⚠ ${label}: 이미지 대기 실패 — 그대로 찍는다`));
}

async function shot(ctx, url, w, out, full, label, open) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(url, { waitUntil: 'commit' });
  await settle(page, `${label} ${w}px`);
  if (open) {
    // **눌러야 보이는 화면**(시트 등). 못 누르면 조용히 홈을 찍게 되므로 시끄럽게 실패한다.
    try {
      await page.getByRole('button', { name: open }).click({ timeout: 5000 });
      await page.waitForTimeout(300); // 열림 전환
    } catch (err) {
      console.error(`    ✕ ${label} ${w}px: '${open}' 을 누르지 못했다 — ${String(err).split(String.fromCharCode(10))[0]}`);
      FAILED.push(`${label}-${w}(open)`);
    }
  }
  // **가로 넘침 검사** — F-5 게이트의 "깨짐 0" 을 눈이 아니라 수로 잰다.
  //   `body` 가 뷰포트보다 넓으면 가로 스크롤이 생긴다 = 레이아웃이 터진 것이다.
  //   88장을 눈으로만 보는 것은 신뢰할 수 없다 — **사람은 32번째쯤에서 안 본다.**
  const over = await page
    .evaluate(() => {
      const d = document.documentElement;
      return Math.max(d.scrollWidth, document.body.scrollWidth) - d.clientWidth;
    })
    .catch(() => 0);
  if (over > 1) {
    console.error(`    ✕ ${label} ${w}px 가로 넘침 ${over}px`);
    OVERFLOW.push(`${label}-${w}(+${over}px)`);
  }
  try {
    // `animations: 'disabled'` + 상한 — 함정 ③(fixed + 긴 full-page)이 여기서 걸린다.
    await page.screenshot({ path: out, fullPage: full, timeout: SHOT_MS, animations: 'disabled' });
  } catch (err) {
    // **조용히 넘어가지 않는다.** 어느 화면 어느 폭인지 말하고 넘어간다 —
    //   빠진 장이 있다는 사실이 보고서에 남아야 한다.
    console.error(`    ✕ ${label} ${w}px 캡처 실패: ${String(err).split(String.fromCharCode(10))[0]}`);
    FAILED.push(`${label}-${w}`);
  }
  await page.close();
}

/** 실패한 장 목록 — 끝에 모아 알린다. 빠진 것을 못 본 것으로 두지 않는다. */
const FAILED = [];
/** 가로로 넘친 화면 — "깨짐 0" 판정의 객관 지표다. */
const OVERFLOW = [];

// ── public — 비인증 실라우트 ─────────────────────────────────────────────
async function capturePublic(browser) {
  mkdirSync(dir('public'), { recursive: true });
  // 서버가 살아 있는지 먼저 본다 — 죽은 서버에 대고 찍으면 **빈 페이지가 조용히 저장된다.**
  try {
    execSync(`curl -sf -o /dev/null "${BASE}/"`, { stdio: 'ignore' });
  } catch {
    console.error(`서버가 없다: ${BASE}\n  먼저 \`npx next build && npx next start -p 3100\` 을 띄운다.`);
    process.exit(3);
  }
  const ctx = await browser.newContext();
  console.log(`\n[public] 비인증 실라우트 — ${PUBLIC_SCREENS.length}화면 × ${WIDTHS.length}폭`);
  for (const s of PUBLIC_SCREENS) {
    for (const w of WIDTHS) await shot(ctx, `${BASE}${s.path}`, w, `${dir('public')}/${s.name}-${w}.png`, true, s.name);
    console.log(`  ${s.name.padEnd(10)} ${s.path.padEnd(12)} ${s.note}`);
  }
  await ctx.close();
}

// ── fixture — 인증 뒤 화면의 표시 층 ─────────────────────────────────────
async function captureFixture(browser) {
  const raw = `${OUT}/_fixture`;
  mkdirSync(raw, { recursive: true });
  mkdirSync(dir('auth-fixture'), { recursive: true });

  // SSR 마크업은 vitest 로 뽑는다 — 프로젝트의 tsx/별칭 해석을 그대로 쓰기 위해서다.
  execSync('npx vitest run tests/site.snapshot.test.tsx', { stdio: 'ignore', env: { ...process.env, SHOT_DIR: raw } });

  const css = ['src/app/globals.css', 'src/core/ui/ui.css', 'src/app/_screens/site/site.css']
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');
  const wrap = (b) => `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<style>${css}</style><style>body{margin:0}img{max-width:100%}</style>
</head><body>${b}</body></html>`;

  const ctx = await browser.newContext();
  console.log(`\n[auth-fixture] 표시 층 SSR — ${Object.keys(FIXTURE_FILES).length}화면 (QA 계정 대역)`);
  for (const [name, f] of Object.entries(FIXTURE_FILES)) {
    const page = `${raw}/${name}-page.html`;
    writeFileSync(page, wrap(readFileSync(`${raw}/${f.body}`, 'utf8')), 'utf8');
    const url = `file:///${page.replace(/\\/g, '/')}`;
    // 전체 높이가 뜻이 없는 것(시트 = position:fixed)은 390 한 폭만 찍는다.
    const widths = f.full ? WIDTHS : [390];
    for (const w of widths) await shot(ctx, url, w, `${dir('auth-fixture')}/${name}-${w}.png`, f.full, name);
    console.log(`  ${name.padEnd(14)} ${widths.join('·')}`);
  }
  await ctx.close();
}

// ── auth — 인증 뒤 실라우트 ──────────────────────────────────────────────
async function captureAuth(browser) {
  const e = env();
  const cohort = process.env.SHOT_COHORT ?? '';
  const missing = ['QA_USER_EMAIL', 'QA_USER_PASSWORD', 'QA_COACH_EMAIL', 'QA_COACH_PASSWORD'].filter((k) => !e[k]);
  if (missing.length) {
    // **값을 찍지 않는다.** 없는 키 이름만 말한다.
    console.error(`.env.local 에 QA 자격이 없다: ${missing.join(', ')}\n  절차서 8단계를 먼저 마친다.`);
    process.exit(4);
  }
  if (!cohort) {
    console.error('SHOT_COHORT 가 없다 — QA 차수 **id** 를 넣는다(코드가 아니라 id).');
    process.exit(5);
  }
  mkdirSync(dir('auth'), { recursive: true });

  /** 화면(UI)으로 로그인한다 — 쿠키를 손으로 만들지 않는다(형식에 결합되면 조용히 깨진다). */
  async function login(role) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: 'commit' });
    await settle(page, `login(${role})`);
    await page.getByLabel(/이메일/).fill(role === 'coach' ? e.QA_COACH_EMAIL : e.QA_USER_EMAIL);
    await page.getByLabel(/비밀번호/).fill(role === 'coach' ? e.QA_COACH_PASSWORD : e.QA_USER_PASSWORD);
    await page.getByRole('button', { name: /로그인/ }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 });
    await page.close();
    return ctx;
  }

  console.log(`\n[auth] 인증 뒤 실라우트 — ${AUTH_SCREENS.length}화면 × ${WIDTHS.length}폭`);
  for (const role of ['user', 'coach']) {
    const list = AUTH_SCREENS.filter((s) => s.role === role);
    if (list.length === 0) continue;
    const ctx = await login(role);
    for (const s of list) {
      const path = s.path.replace('{cohort}', cohort);
      const widths = s.full === false ? [390] : WIDTHS;
      for (const w of widths) await shot(ctx, `${BASE}${path}`, w, `${dir('auth')}/${s.name}-${w}.png`, s.full !== false, s.name, s.open);
      console.log(`  [${role}] ${s.name.padEnd(14)} ${path.padEnd(28)} ${s.note}`);
    }
    await ctx.close();
  }
}

const browser = await chromium.launch();
try {
  if (MODE === 'public' || MODE === 'all') await capturePublic(browser);
  if (MODE === 'fixture' || MODE === 'all') await captureFixture(browser);
  if (MODE === 'auth') await captureAuth(browser);
} finally {
  await browser.close();
}

// 요약 — **없는 것을 없다고 말한다.** 개별 실패는 그때그때 찍히지만,
//   끝에서 한 번 더 세지 않으면 스크롤에 묻힌다.
console.log("");
console.log(FAILED.length ? "X 캡처 실패 " + FAILED.length + "장: " + FAILED.join(", ") : "O 캡처 실패 0");
console.log(OVERFLOW.length
  ? "X 가로 넘침 " + OVERFLOW.length + "건: " + OVERFLOW.join(", ")
  : "O 가로 넘침 0 — 전 화면 전 폭에서 가로 스크롤이 생기지 않는다");

console.log(`\n산출: ${OUT}/`);
console.log('  public/       — 비인증 실라우트(진짜 화면)');
console.log('  auth-fixture/ — 인증 뒤 화면의 표시 층(대역)');
console.log('  auth/         — 인증 뒤 실라우트(QA 자격 필요)');
