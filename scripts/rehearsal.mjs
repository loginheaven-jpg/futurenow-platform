// 2기 시작 통리허설 — **걸으면서 화면 문장을 순서대로 적는다**(ORDER rehearsal_2gi).
//
// **이 도구는 고치지 않는다.** 겪은 것을 적고 어긋난 자리를 목록으로 낼 뿐이다.
//   재는 것은 「동작하는가」가 아니라 **「겪는 것이 말이 되는가」** 이므로,
//   화면마다 **참여자가 읽는 문장 전부**를 순서대로 남긴다. 판단은 사람이 한다.
//
// **실기수·실계정 무접촉** — 실기수 코드(ZR4KB·HMT7Z)에 닿으면 던진다.
//
// 사용: node scripts/rehearsal.mjs [단계...]   예) node scripts/rehearsal.mjs 1 2 4
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const env = readFileSync('.env.local', 'utf8');
const g = (k) => ((env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1] || '').trim();
const BASE = process.env.REH_BASE ?? 'https://future.yebom.org';
const OUT = 'docs/shots/rehearsal';
const FORBIDDEN = ['ZR4KB', 'HMT7Z'];
mkdirSync(OUT, { recursive: true });

const log = [];
const say = (step, what, detail = '') => { const l = `[${step}] ${what}${detail ? ' — ' + detail : ''}`; log.push(l); console.log(l); };

/** 화면이 참여자에게 하는 말 — **순서대로** 담는다(§2 문장 흐름). */
async function sentences(page) {
  return page.evaluate(() => (document.body.innerText || '')
    .split('\n').map((s) => s.trim()).filter((s) => s.length > 1));
}
async function settle(page, ms = 20000) {
  await page.waitForFunction(() => !((document.body.innerText || '').includes('불러오는 중')), null, { timeout: ms });
}
async function shot(page, name) {
  for (const w of [1280, 390]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: false });
  }
  await page.setViewportSize({ width: 390, height: 900 });
}
async function login(page, who) {
  await page.goto(`${BASE}/login`, { waitUntil: 'load', timeout: 30000 });
  await page.getByLabel(/이메일/).fill(g(who === 'coach' ? 'QA_COACH_EMAIL' : 'QA_USER_EMAIL'));
  await page.getByLabel(/비밀번호/).fill(g(who === 'coach' ? 'QA_COACH_PASSWORD' : 'QA_USER_PASSWORD'));
  await page.getByRole('button', { name: /로그인/ }).click();
  await page.waitForURL(/\/(home|coach|admin)/, { timeout: 30000 });
}

const only = process.argv.slice(2).filter((a) => /^\d$/.test(a));
const want = (n) => only.length === 0 || only.includes(String(n));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
const page = await ctx.newPage();
const flow = [];   // §2 — 순서대로 적은 문장

try {
  // ① 모집 화면
  if (want(1)) {
    await page.goto(`${BASE}/recruit`, { waitUntil: 'load', timeout: 30000 });
    await settle(page);
    const s = await sentences(page);
    flow.push({ step: '① /recruit', lines: s.slice(0, 26) });
    const cards = await page.locator('img[src*="/recruit/card-"]').count();
    const seats = s.find((x) => /남은 자리|자리가|선착순/.test(x)) ?? '(없음)';
    say('①', '모집 화면', `문장 ${s.length}줄 · 카드 이미지 ${cards}장 · 자리 안내 「${seats}」`);
    await shot(page, '01-recruit');
  }

  // ② 신청 — QA 기수 딥링크(실기수 아님)
  if (want(2)) {
    const code = 'QAAAA';
    if (FORBIDDEN.includes(code)) throw new Error('★ 멈춘다 — 실기수 코드다');
    await page.goto(`${BASE}/join?code=${code}`, { waitUntil: 'load', timeout: 30000 });
    await settle(page);
    const s = await sentences(page);
    flow.push({ step: `② /join?code=${code}`, lines: s.slice(0, 24) });
    const header = await page.locator('header').first().innerText().catch(() => '(없음)');
    say('②', '딥링크 진입', `제목바 「${header.replace(/\s+/g, ' ')}」 · 문장 ${s.length}줄`);
    await shot(page, '02-join');
  }

  // ④ 홈 — 참여자
  if (want(4)) {
    await login(page, 'user');
    await page.goto(`${BASE}/home`, { waitUntil: 'load', timeout: 30000 });
    await settle(page);
    const s = await sentences(page);
    flow.push({ step: '④ /home', lines: s.slice(0, 26) });
    say('④', '회원 홈', `문장 ${s.length}줄`);
    await shot(page, '04-home');
  }

  // ④-b **승인 대기 중인 사람의 길**(지휘부 감리 2026-08-29 — 안 잰 길 ①)
  //   신청은 들어왔는데 **승인 전까지 그분이 보는 화면**을 한 번도 안 걸었다.
  //   방문회원 문구가 바뀌었고 껍데기도 바뀌었다 — **그분은 다음 로그인 때 처음 겪는다.**
  //   갈래가 셋이다(접수 · 확인 필요 · 기간 종료). 여기서는 **화면이 서는지와 문장 흐름**을 본다.
  if (want(4)) {
    await page.goto(`${BASE}/pending`, { waitUntil: 'load', timeout: 30000 });
    await settle(page).catch(() => {});
    const s = await sentences(page);
    flow.push({ step: '④-b /pending', lines: s.slice(0, 20) });
    const landed = new URL(page.url()).pathname;
    // **게이트가 되돌리면 그것도 값이다** — 승인된 계정으로는 이 화면에 못 선다(불변식 19 형식).
    say('④-b', '승인 대기 화면', `착지 ${landed} · 문장 ${s.length}줄`);
    await shot(page, '04b-pending');
  }

  // ⑤ 진단 허브
  if (want(5)) {
    await page.goto(`${BASE}/home/assessments`, { waitUntil: 'load', timeout: 30000 });
    await settle(page);
    const s = await sentences(page);
    flow.push({ step: '⑤ /home/assessments', lines: s.slice(0, 24) });
    say('⑤', '진단 허브', `문장 ${s.length}줄`);
    await shot(page, '05-assessments');
  }

  // ⑦ 동행 피드
  if (want(7)) {
    await page.goto(`${BASE}/feed`, { waitUntil: 'load', timeout: 30000 });
    await settle(page);
    const s = await sentences(page);
    flow.push({ step: '⑦ /feed', lines: s.slice(0, 22) });
    say('⑦', '동행 피드', `문장 ${s.length}줄`);
    await shot(page, '07-feed');
  }

  // ⑧ 서가
  if (want(8)) {
    await page.goto(`${BASE}/library`, { waitUntil: 'load', timeout: 30000 });
    await settle(page);
    const s = await sentences(page);
    flow.push({ step: '⑧ /library', lines: s.slice(0, 22) });
    say('⑧', '서가', `문장 ${s.length}줄`);
    await shot(page, '08-library');
  }

  // ⑨ 내 정보
  if (want(9)) {
    await page.goto(`${BASE}/account`, { waitUntil: 'load', timeout: 30000 });
    await settle(page);
    const s = await sentences(page);
    flow.push({ step: '⑨ /account', lines: s.slice(0, 24) });
    say('⑨', '내 정보', `문장 ${s.length}줄`);
    await shot(page, '09-account');
  }
} finally {
  await browser.close();
  writeFileSync(`${OUT}/flow.json`, JSON.stringify(flow, null, 2), 'utf8');
  console.log(`\n문장 흐름 기록: ${OUT}/flow.json · 캡처: ${OUT}/`);
}
