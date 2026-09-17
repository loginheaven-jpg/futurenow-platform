// 워크북 사진 배포 후 실화면 검증(ADR-197) — **눈으로 확인하는 것을 도구로 고정한다.**
//
// 잰다:
//   ⑴ 참여자 카드 맨 위에 「오늘 워크북 갈무리」 · 「인도자 열람」 기본 체크 · 여러 장 입력(capture 없음)
//   ⑵ 가짜 이미지 두 장을 한꺼번에 올리면 원본 둘 + 미리보기 둘이 저장소에 선다
//   ⑶ 담당 인도자·운영자 명단 펼침에 보이고, 운영자에게만 삭제 표시가 있다 · 모아 보기에는 사진이 없다
//   ⑷ 참여자가 체크를 풀면 **인도자·운영자 화면에서 사라지고**, 다시 체크하면 돌아온다
//   ⑸ 뒤처리 — 올린 사진을 참여자 화면의 삭제로 지우고 저장소가 원래 수로 돌아왔는지 센다
//
// 픽스처는 **QA 회기 · QA 계정 셋**이다(실기수 접근 0). 이미지는 글자만 적힌 가짜다.
// **기다림은 조건으로 끝나고 상한이 있으며 넘기면 시끄럽게 실패한다**(CLAUDE §11) — 고정 대기 0.
// DB 는 **읽기만** 한다(셈) — 쓰기는 전부 화면이 한다.
//
// 사용: node scripts/postdeployWorkbook.mjs [기준 URL] [--clean]
//   --clean  시작 전에 QA 참여자의 그 회차 사진을 화면의 삭제로 전부 지운다(중단된 회차가 남긴 가짜 사진 치우기).
//            QA 참여자 계정에만 닿는다 — 실기수 접근 0.
// **중단돼도 뒤처리한다** — 이 도구가 올린 만큼은 finally 에서 참여자 화면으로 지운다.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import pg from 'pg';

const ARGS = process.argv.slice(2);
const BASE = ARGS.find((a) => !a.startsWith('--')) ?? 'https://future.yebom.org';
const CLEAN = ARGS.includes('--clean');
const OUT = 'docs/reports/captures/workbook_photos';
const TITLE = '오늘 워크북 갈무리';
const LIMIT = 30_000;

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);
for (const k of ['SUPABASE_DB_URL', 'QA_USER_EMAIL', 'QA_USER_PASSWORD', 'QA_COACH_EMAIL', 'QA_COACH_PASSWORD', 'QA_ADMIN_EMAIL', 'QA_ADMIN_PASSWORD', 'QA_COHORT_CODE']) {
  if (!env[k]) { console.log(`X env ${k} 가 없다`); process.exit(2); }
}

const results = [];
const check = (ok, label, detail = '') => {
  results.push(ok);
  console.log(`  ${ok ? 'O' : 'X'} ${label.padEnd(34)} ${detail}`);
};

/** 조건이 참이 될 때까지 — 상한을 넘기면 마지막 값을 들고 실패한다. */
async function until(label, fn, pred, limit = LIMIT) {
  const start = Date.now();
  let last;
  for (;;) {
    last = await fn();
    if (pred(last)) return last;
    if (Date.now() - start > limit) throw new Error(`기다림 상한 초과 — ${label} (마지막 값: ${JSON.stringify(last)})`);
    await new Promise((r) => setImmediate(r));
  }
}

const db = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const one = async (sql, p) => (await db.query(sql, p)).rows[0];
const cohortId = (await one('select id from public.cohorts where code=$1', [env.QA_COHORT_CODE])).id;
const userId = (await one('select id from auth.users where email=$1', [env.QA_USER_EMAIL])).id;
const S = (await one('select min(session_no)::int s from public.cohort_sessions where cohort_id=$1 and opens_at <= now()', [cohortId])).s;
const objCount = async () => Number((await one(
  `select count(*)::int n from storage.objects where bucket_id='checkin-photos' and (storage.foldername(name))[2]=$1 and (storage.foldername(name))[3]=$2`,
  [userId, String(S)])).n);
const prefOf = async () => (await one('select coach_view from public.checkin_photo_prefs where user_id=$1 and session_no=$2', [userId, S]))?.coach_view ?? null;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

async function login(email, password, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  // 하이드레이션 전에 채우면 입력이 상태에 안 들어가 로그인 단추가 비활성으로 남는다(실측).
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/이메일/).fill(email);
  await page.getByLabel(/비밀번호/).fill(password);
  await page.getByRole('button', { name: /로그인/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: LIMIT });
  return page;
}

// 가짜 이미지 — 글자만 적힌 화면을 찍어 파일로 쓴다(사람·실데이터 0).
async function fakeImage(name, text) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1200 } });
  const p = await ctx.newPage();
  await p.setContent(`<body style="margin:0;background:#fbf8f1;font:48px sans-serif;display:flex;align-items:center;justify-content:center;height:100vh">${text}</body>`);
  const path = join(tmpdir(), name); // 캡처 폴더에 두지 않는다 — 커밋될 까닭이 없는 가짜 파일이다
  writeFileSync(path, await p.screenshot({ type: 'jpeg', quality: 90 }));
  await ctx.close();
  return path;
}

const staffImgs = async (page) => page.locator(`img[alt="${TITLE}"]`).count();
// 운영자 삭제 표시 — **CSS 로 정확히 잰다.** 처음엔 getByRole(name) 으로 쟀는데 실화면에 단추가 있는데도 0 을 냈다
//   (HTML 덤프로 확인). 그러면 인도자 쪽 「없음」 통과도 **자를 안 물린 0** 이었다 — 운영자 쪽 ≥ 2 가 이 자가 무는 증거다.
const adminDeletes = async (page) => page.locator('button[aria-label="사진 삭제(운영자)"]').count();
const ROSTER = `${BASE}/coach/cohort/${cohortId}/checkin?session=${S}&open=${userId}`;

let exitCode = 0;
let user = null;
let shownBefore = null; // 이 도구가 올리기 직전의 사진 수 — 뒤처리는 여기까지 되돌린다

/** 참여자 화면의 삭제 단추로 target 장까지 줄인다. 상한이 있다(장수 + 2 회). */
async function deleteDownTo(page, target) {
  const start = await staffImgs(page);
  for (let i = 0; i < start - target + 2 && (await staffImgs(page)) > target; i++) {
    const n = await staffImgs(page);
    await page.locator('button[aria-label="사진 삭제"]').last().click();
    await until('삭제가 화면에', () => staffImgs(page), (m) => m === n - 1);
  }
  return staffImgs(page);
}

try {
  console.log(`\n[워크북 사진 실화면] ${BASE} · QA 회기 · ${S}회차`);
  // ⑴ 참여자 카드
  user = await login(env.QA_USER_EMAIL, env.QA_USER_PASSWORD, { width: 390, height: 844 });
  await user.goto(`${BASE}/my/cohorts/${cohortId}/checkin/${S}?edit=1`, { waitUntil: 'domcontentloaded' });
  await user.getByText(TITLE, { exact: true }).first().waitFor({ timeout: LIMIT });
  // **하이드레이션 전에 누르면 클릭이 사라진다**(실측 — 서버가 그린 단추는 보이지만 아직 손이 없다).
  //   글자가 보인다는 것은 손이 붙었다는 뜻이 아니다. 네트워크가 가라앉을 때까지 기다린다(상한 있음).
  await user.waitForLoadState('networkidle', { timeout: LIMIT });
  if (CLEAN) {
    const left = await deleteDownTo(user, 0);
    await until('--clean 저장소 0', objCount, (n) => n === 0);
    check(left === 0, '--clean 남은 가짜 사진 치움', `화면 ${left} · 저장소 0`);
  }
  const before = await objCount();
  const box = user.getByRole('checkbox', { name: /인도자 열람/ });
  check(await box.getAttribute('aria-checked') === 'true', '「인도자 열람」 기본 체크', `aria-checked=${await box.getAttribute('aria-checked')}`);
  const input = user.locator('input[type="file"]');
  check(await input.count() === 1, '올리기 칸 하나');
  check(await input.getAttribute('multiple') !== null && await input.getAttribute('capture') === null, '여러 장 · capture 없음');
  const titleY = (await user.getByText(TITLE, { exact: true }).first().boundingBox()).y;
  const firstFieldY = (await user.locator('textarea, input:not([type="file"])').first().boundingBox())?.y ?? Infinity;
  check(titleY < firstFieldY, '제목이 첫 입력칸보다 위', `제목 y=${Math.round(titleY)} · 첫 칸 y=${Math.round(firstFieldY)}`);
  await user.screenshot({ path: `${OUT}/1_card_top.png` });

  // ⑵ 두 장 한꺼번에
  const a = await fakeImage('_fake_a.jpg', 'QA 워크북 쪽 1');
  const b = await fakeImage('_fake_b.jpg', 'QA 워크북 쪽 2');
  const shown0 = await staffImgs(user);
  shownBefore = shown0;
  await input.setInputFiles([a, b]);
  await until('참여자 화면에 두 장', () => staffImgs(user), (n) => n >= shown0 + 2);
  const after = await until('저장소에 원본 둘 + 미리보기 둘', objCount, (n) => n >= before + 4);
  check(after - before === 4, '저장소 원본 2 + 미리보기 2', `${before} → ${after}`);
  // 미리보기 그림이 **실제로 로드된 뒤** 찍는다 — 장수만 세고 찍었더니 빈 칸이 찍혔다(실측).
  const loaded = () => user.locator(`img[alt="${TITLE}"]`).evaluateAll((els) => els.filter((e) => e.complete && e.naturalWidth > 0).length);
  check((await until('미리보기 로드', loaded, (n) => n >= shown0 + 2)) >= 2, '미리보기가 그려진다', '');
  await user.screenshot({ path: `${OUT}/2_card_uploaded.png` });

  // ⑶ 인도자 · 운영자
  const coach = await login(env.QA_COACH_EMAIL, env.QA_COACH_PASSWORD, { width: 1280, height: 900 });
  await coach.goto(ROSTER, { waitUntil: 'networkidle' });
  const coachSeen = await until('인도자 명단 펼침에 사진', () => staffImgs(coach), (n) => n >= 2);
  check(coachSeen >= 2, '인도자 — 체크 상태에서 보인다', `img ${coachSeen}`);
  check(await adminDeletes(coach) === 0, '인도자 — 삭제 표시 없음', `${await adminDeletes(coach)}`);
  const collect = coach.locator('section', { has: coach.getByRole('heading', { name: '문장 모아 보기' }) });
  // ⑦ 잴 구간이 실재해야 「0」이 뜻을 갖는다 — 구간을 못 찾으면 img 도 0 으로 센다.
  check(await collect.count() === 1 && await collect.locator('img').count() === 0, '모아 보기 — 사진 0', `구간 ${await collect.count()} · img ${await collect.locator('img').count()}`);
  await coach.screenshot({ path: `${OUT}/3_coach_visible.png`, fullPage: true });

  const admin = await login(env.QA_ADMIN_EMAIL, env.QA_ADMIN_PASSWORD, { width: 1280, height: 900 });
  await admin.goto(ROSTER, { waitUntil: 'networkidle' });
  const adminSeen = await until('운영자 명단 펼침에 사진', () => staffImgs(admin), (n) => n >= 2);
  check(adminSeen >= 2, '운영자 — 체크 상태에서 보인다', `img ${adminSeen}`);
  check(await adminDeletes(admin) >= 2, '운영자 — 삭제 표시 있음', `${await adminDeletes(admin)}`);

  // ⑷ 해제 → 사라진다
  await box.click();
  await until('체크 해제가 화면에', () => box.getAttribute('aria-checked'), (v) => v === 'false');
  await until('해제가 저장됐다', prefOf, (v) => v === false);
  await coach.reload({ waitUntil: 'domcontentloaded' });
  await coach.getByRole('heading', { name: '문장 모아 보기' }).waitFor({ timeout: LIMIT });
  check(await staffImgs(coach) === 0, '해제 — 인도자에게 안 보인다', `img ${await staffImgs(coach)}`);
  await coach.screenshot({ path: `${OUT}/4_coach_hidden.png`, fullPage: true });
  await admin.reload({ waitUntil: 'domcontentloaded' });
  await admin.getByRole('heading', { name: '문장 모아 보기' }).waitFor({ timeout: LIMIT });
  check(await staffImgs(admin) === 0, '해제 — 운영자에게도 안 보인다', `img ${await staffImgs(admin)}`);
  await user.screenshot({ path: `${OUT}/5_card_unchecked.png` });

  // 다시 체크 → 돌아온다
  await box.click();
  await until('다시 체크가 화면에', () => box.getAttribute('aria-checked'), (v) => v === 'true');
  await until('다시 체크가 저장됐다', prefOf, (v) => v === true);
  await coach.reload({ waitUntil: 'domcontentloaded' });
  check((await until('인도자에게 다시', () => staffImgs(coach), (n) => n >= 2)) >= 2, '다시 체크 — 인도자에게 돌아온다');

  // ⑸ 뒤처리 — 참여자 화면의 삭제로
  await deleteDownTo(user, shown0);
  shownBefore = null;
  const cleaned = await until('저장소가 원래 수로', objCount, (n) => n === before);
  check(cleaned === before, '뒤처리 — 원본·미리보기 함께 지워졌다', `${after} → ${cleaned}`);
} catch (e) {
  console.log(`  X 중단: ${e.message}`);
  exitCode = 1;
} finally {
  if (user && shownBefore !== null) {
    // 중단돼도 이 도구가 올린 것은 치운다 — 남기면 다음 회차의 기준선이 틀린다.
    await user.reload({ waitUntil: 'networkidle' }).catch(() => undefined);
    const left = await deleteDownTo(user, shownBefore).catch(() => null);
    console.log(`  ${left === shownBefore ? 'O' : 'X'} 중단 뒤처리                            화면 ${left} (목표 ${shownBefore})`);
  }
  await browser.close();
  await db.end();
}

const bad = results.filter((r) => !r).length;
console.log(bad === 0 && exitCode === 0 ? '\nO 워크북 사진 실화면 전항 통과' : `\nX 실패 ${bad}건${exitCode ? ' · 중단' : ''}`);
process.exit(bad === 0 && exitCode === 0 ? 0 : 1);
