// 실제 카드 → 서버 액션 → QA DB → 재방문·인도자 열람. 실행 후 QA 답변을 원복한다.
import { readFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import pg from 'pg';
import { chromium } from 'playwright';
const BASE = process.argv[2] ?? 'http://localhost:3013';
const target = new URL(BASE);
assert(target.origin === BASE && target.pathname === '/' && (
  BASE === 'http://localhost:3013' ||
  (target.protocol === 'https:' && (target.hostname === 'future.yebom.org' || target.hostname.endsWith('.vercel.app')))
), 'Only the local app or verified Vercel/production origin is allowed');
const OUT = 'docs/reports/captures/session3_seed';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]));
assert(env.QA_COHORT_CODE && !['ZR4KB', 'HMT7Z', 'JOINF'].includes(env.QA_COHORT_CODE));
const db = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
const browser = await chromium.launch();
let cohort, user, backup, ready = false;
const errors = [];
try {
  await db.connect();
  cohort = (await db.query('select id from public.cohorts where code=$1', [env.QA_COHORT_CODE])).rows[0]?.id;
  user = (await db.query('select id from auth.users where email=$1', [env.QA_USER_EMAIL])).rows[0]?.id;
  assert(cohort && user, 'QA fixtures missing');
  assert.equal((await db.query('select public.is_cohort_member($1,$2) ok', [cohort, user])).rows[0].ok, true);
  const session = (await db.query('select opens_at from public.cohort_sessions where cohort_id=$1 and session_no=3', [cohort])).rows[0];
  assert(session && new Date(session.opens_at) <= new Date(), 'QA session 3 must already be open');
  backup = (await db.query('select to_jsonb(c) record from public.checkins c where cohort_id=$1 and user_id=$2 and session_no=3', [cohort, user])).rows[0]?.record ?? null;
  ready = true;
  await db.query('delete from public.checkins where cohort_id=$1 and user_id=$2 and session_no=3', [cohort, user]);
  async function login(who, width) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByLabel(/이메일/).fill(env[`QA_${who}_EMAIL`]);
    await page.getByLabel(/비밀번호/).fill(env[`QA_${who}_PASSWORD`]);
    await page.getByRole('button', { name: /로그인/ }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
    return page;
  }
  const page = await login('USER', 390);
  await page.goto(`${BASE}/my/cohorts/${cohort}/checkin/3?edit=1`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.locator('#input-seed_start_think').waitFor();
  const seed = page.locator('textarea[id^="input-seed_"]');
  assert.equal(await seed.count(), 12);
  assert.equal(await page.getByText('이번 주에 실제로 바꿔 볼 짝 하나만 옮겨 주세요.', { exact: false }).count(), 0);
  assert.equal(await page.getByText('여기서 한 겹 더 들어갑니다', { exact: true }).count(), 0);
  assert.equal(await page.getByText('이번 한 걸음은 나만 볼게요', { exact: true }).count(), 0);
  await page.getByRole('button', { name: '갈무리 저장', exact: true }).click();
  await page.getByRole('button', { name: '채우러 가기', exact: true }).click();
  await page.getByRole('checkbox', { name: '관계', exact: true }).click();
  await page.locator('#fld-gap_want input').fill('QA 관계 실천');
  const keys = await seed.evaluateAll((els) => els.map((e) => e.id));
  for (const [i, key] of keys.entries()) await page.locator('#' + key).fill(`QA seed item ${i + 1}`);
  await page.getByRole('button', { name: '이번 주 한 걸음으로 선택', exact: true }).first().click();
  assert.equal(await page.locator('#fld-step_what input').inputValue(), 'QA seed item 1');
  await page.locator('#fld-step_when input').fill('QA 월요일 오전');
  await page.getByRole('checkbox', { name: '담담함', exact: true }).click();
  await page.getByRole('checkbox', { name: '했습니다', exact: true }).click();
  await page.locator('#fld-self_note textarea').fill('QA 실천 기록');
  await page.locator('#fld-confidence input').fill('7');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: `${OUT}/mobile.png`, fullPage: true });
  await page.getByRole('button', { name: '갈무리 저장', exact: true }).click();
  await page.getByText('갈무리를 저장했습니다.', { exact: true }).waitFor({ timeout: 30000 });
  const row = (await db.query('select answers,submitted_at from public.checkins where cohort_id=$1 and user_id=$2 and session_no=3', [cohort, user])).rows[0];
  assert(row.submitted_at);
  keys.forEach((key, i) => assert.equal(row.answers[key.replace('input-', '')], `QA seed item ${i + 1}`));
  await page.goto(`${BASE}/my/cohorts/${cohort}/checkin/3`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /적으신 것 모두 보기/ }).click();
  for (let i = 1; i <= 12; i++) assert((await page.getByText(`QA seed item ${i}`, { exact: true }).count()) > 0);
  await page.goto(`${BASE}/my/cohorts/${cohort}/checkin/3?edit=1`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('#input-seed_down_act').inputValue(), 'QA seed item 12');
  const coach = await login('COACH', 1280);
  await coach.goto(`${BASE}/coach/cohort/${cohort}/checkin?session=3&open=${user}`, { waitUntil: 'networkidle', timeout: 60000 });
  for (let i = 1; i <= 12; i++) assert((await coach.getByText(`QA seed item ${i}`, { exact: true }).count()) > 0);
  assert.deepEqual(errors, []);
  console.log('PASS: mobile 12 fields, hidden chapters, missing-field navigation, select step, submit, DB persistence, reload/edit, coach 12 answers, no page errors');
} finally {
  await browser.close();
  if (ready) {
    await db.query('begin');
    try {
      await db.query('delete from public.checkins where cohort_id=$1 and user_id=$2 and session_no=3', [cohort, user]);
      if (backup) await db.query('insert into public.checkins select * from jsonb_populate_record(null::public.checkins,$1::jsonb)', [JSON.stringify(backup)]);
      await db.query('commit');
      console.log('RESTORED: original QA session3 record');
    } catch (e) { await db.query('rollback'); throw e; }
  }
  await db.end();
}
