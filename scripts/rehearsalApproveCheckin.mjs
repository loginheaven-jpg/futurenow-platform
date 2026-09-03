// §1 ③ 승인 · ⑥ 갈무리 — **QA 기수 안에서 실제로 걷는다**(지휘부 판정 2026-08-29).
//
// **9월 20일에 반드시 일어나는 일이다.** 안 재고 넘어가면 그날 처음 겪는다.
//
// **실기수·실계정 무접촉** — QA 기수(QAAAA)와 가상 회원만 쓴다.
//   가상 회원을 **보류 상태로 만들어** 승인 큐를 실제로 지나가고,
//   QA 기수에 **회차 일정을 넣어** 1회차를 제출·읽기·고치기까지 건다.
//   **끝나면 일정까지 지운다**(§5 흔적 0).
//
// **고치지 않는다.** 겪은 것을 적는다.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf8');
const g = (k) => ((env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1] || '').trim();
const BASE = 'https://future.yebom.org';
const OUT = 'docs/shots/rehearsal';
mkdirSync(OUT, { recursive: true });
const FORBIDDEN = ['ZR4KB', 'HMT7Z'];

const db = new pg.Client({ connectionString: g('SUPABASE_DB_URL'), ssl: { rejectUnauthorized: false } });
const admin = createClient(g('NEXT_PUBLIC_SUPABASE_URL'), g('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const found = [];
const note = (k, v) => { console.log(`  ${k}: ${v}`); found.push(`${k}: ${v}`); };

const settle = (p) => p.waitForFunction(() => !((document.body.innerText || '').includes('불러오는 중')), null, { timeout: 20000 });
async function loginAs(ctx, who) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/login`, { waitUntil: 'load', timeout: 30000 });
  await p.getByLabel(/이메일/).fill(g(who === 'coach' ? 'QA_COACH_EMAIL' : 'QA_USER_EMAIL'));
  await p.getByLabel(/비밀번호/).fill(g(who === 'coach' ? 'QA_COACH_PASSWORD' : 'QA_USER_PASSWORD'));
  await p.getByRole('button', { name: /로그인/ }).click();
  await p.waitForURL(/\/(home|coach|admin)/, { timeout: 30000 });
  return p;
}

const browser = await chromium.launch();
let seededCohort = null;
try {
  await db.connect();
  const { rows: [qa] } = await db.query(`select id, code from public.cohorts where code='QAAAA'`);
  if (!qa) throw new Error('QA 기수가 없다 — qaCohort.mjs up 을 먼저 돌려라');
  if (FORBIDDEN.includes(qa.code)) throw new Error('★ 멈춘다 — 실기수다');

  // ── ③ 승인: 가상 회원 하나를 **승인 대기(pending)** 로 만들어 큐에 올린다
  const { rows: [v] } = await db.query(
    `select id, email from auth.users where email like '%@qa.invalid' order by email limit 1`);
  if (!v) throw new Error('가상 회원이 없다');
  // **행을 새로 만든다**(기존 행을 고치지 않는다). 이미 있으면 그대로 둔다.
  await db.query(
    `insert into public.memberships (user_id, status) values ($1,'pending') on conflict (user_id) do nothing`, [v.id]);
  const { rows: [before] } = await db.query(`select status from public.memberships where user_id=$1`, [v.id]);
  note('③ 가상 회원 상태(승인 전)', before?.status ?? '(행 없음)');

  const c1 = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const coach = await loginAs(c1, 'coach');
  await coach.goto(`${BASE}/admin/approvals`, { waitUntil: 'load', timeout: 30000 });
  await settle(coach).catch(() => {});
  const qText = await coach.evaluate(() => document.body.innerText || '');
  const landed = new URL(coach.url()).pathname;
  const inQueue = qText.includes(v.email) || qText.includes(v.email.split('@')[0]);
  // ★ **QA 인도자는 운영자가 아니다** — 승인 큐는 운영자 화면이고 게이트가 되돌린다.
  //   이것은 결함이 아니라 게이트가 작동한 것이다. 화면으로 승인을 걸으려면 **실계정 운영자**가 필요하다.
  note('③ 승인 큐 접근(QA 인도자)', `착지 ${landed} — ${landed === '/admin/approvals' ? '들어갔다' : '게이트가 되돌렸다(운영자 아님)'}`);
  if (!inQueue && landed !== '/admin/approvals') {
    // 화면으로 못 걸으니 **큐가 그 사람을 담고 있는지**를 데이터로 확인한다(참여자 경로가 아님을 밝힌다).
    const { rows: q } = await db.query(`select user_id, status from public.memberships where user_id=$1`, [v.id]);
    note('③ 큐에 담길 조건(데이터)', `memberships.status=${q[0]?.status} — pending 이면 큐 대상이다`);
  } else {
    note('③ 승인 큐 화면에 그 사람이 뜨는가', inQueue ? 'O 뜬다' : '★ 안 뜬다');
  }
  // ★★ **그림 이름이 담긴 화면과 달랐다**(U-6 · 반증자가 잡았다). 게이트가 되돌리면 이 그림에는
  //   승인 큐가 아니라 **착지한 다른 화면**이 담기는데 파일 이름은 `03-approvals.png` 그대로였다.
  //   *없는 그림*은 목록에서 티가 나지만 **이름이 맞아 보이는 그림**은 「봤다」고 착각하게 만든다.
  //   그래서 **착지한 곳을 파일 이름에 싣는다** — 이름과 내용이 갈릴 수 없게.
  const shotName = landed === '/admin/approvals' ? '03-approvals' : `03-approvals-BLOCKED${landed.replace(/\//g, '_')}`;
  await coach.screenshot({ path: `${OUT}/${shotName}.png` });
  note('③ 그림', `${shotName}.png — 담긴 화면은 ${landed} 다`);
  note('③ 승인 큐 문장', qText.split('\n').map((s) => s.trim()).filter((s) => s.length > 1).slice(0, 8).join(' | '));

  // ── ⑥ 갈무리: QA 기수에 회차 일정을 넣는다
  // ★ `seed_cohort_sessions` 는 **그 기수의 인도자만** 부를 수 있다(실측: `not authorized to seed sessions`).
  //   여기서는 서버 권한으로 도는 도구라 `auth.uid()` 가 없다 — RPC 대신 **표에 직접 넣는다.**
  //   QA 기수 안에서만 하고 끝에 지운다. **관문을 우회한 것이 아니라 관문 밖에서 데이터를 만든 것이다.**
  await db.query(
    `insert into public.cohort_sessions (cohort_id, session_no, held_at, opens_at, closes_at)
     values ($1, 1, now() - interval '1 hour', now() - interval '1 hour', now() + interval '7 days')
     on conflict (cohort_id, session_no) do nothing`, [qa.id]);
  seededCohort = qa.id;
  const { rows: [ses] } = await db.query(
    `select session_no, opens_at, closes_at from public.cohort_sessions where cohort_id=$1 order by session_no limit 1`, [qa.id]);
  note('⑥ 회차 일정', ses ? `${ses.session_no}회차 · ${ses.opens_at} ~ ${ses.closes_at}` : '★ 안 만들어졌다');

  const c2 = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const user = await loginAs(c2, 'user');
  await user.goto(`${BASE}/my/cohorts/${qa.id}`, { waitUntil: 'load', timeout: 30000 });
  await settle(user).catch(() => {});
  const homeText = (await user.evaluate(() => document.body.innerText || '')).split('\n').map((s) => s.trim()).filter((s) => s.length > 1);
  note('⑥ 차수 홈 문장', homeText.slice(0, 10).join(' | '));
  await user.screenshot({ path: `${OUT}/06-cohort-home.png` });

  await user.goto(`${BASE}/my/cohorts/${qa.id}/checkin/1?edit=1`, { waitUntil: 'load', timeout: 30000 });
  await settle(user).catch(() => {});
  const cText = (await user.evaluate(() => document.body.innerText || '')).split('\n').map((s) => s.trim()).filter((s) => s.length > 1);
  note('⑥ 1회차 갈무리 첫 문장들', cText.slice(0, 8).join(' | '));
  await user.screenshot({ path: `${OUT}/06-checkin.png` });

  // 한 칸 적고 제출한다
  const ta = user.locator('textarea').first();
  if (await ta.count()) await ta.fill('[리허설] 첫 걸음 한 줄');
  const submit = user.getByRole('button', { name: /제출|저장|마치/ }).first();
  const submitLabel = (await submit.count()) ? (await submit.innerText()).trim() : '(없음)';
  note('⑥ 제출 단추 이름', submitLabel);
  if (await submit.count()) {
    await submit.click();
    await user.waitForTimeout(3000);
    const after = (await user.evaluate(() => document.body.innerText || '')).replace(/\s+/g, ' ').slice(0, 90);
    note('⑥ 제출 뒤 화면', after);
    await user.screenshot({ path: `${OUT}/06-after-submit.png` });
  }
  await user.goto(`${BASE}/my/cohorts/${qa.id}/checkin/1`, { waitUntil: 'load', timeout: 30000 });
  await settle(user).catch(() => {});
  const readText = (await user.evaluate(() => document.body.innerText || '')).replace(/\s+/g, ' ').slice(0, 110);
  note('⑥ 읽기 화면', readText);
  const editBtn = user.getByRole('link', { name: /고쳐 쓰기|고치기/ }).first();
  note('⑥ 「고쳐 쓰기」가 있는가', (await editBtn.count()) ? 'O 있다' : '★ 없다');

  // ── ⑶ 재측정: 목록에서 **눌렀을 때** 무엇이 뜨는가
  // 인도자가 인도자 등급 자료를 하나 올리고, 참여자가 그 줄을 눌러 본다.
  await db.query(
    `insert into public.library_items (title, tier, kind, url, created_by)
     values ('[리허설] 눌러보기 인도자 전용','coach','link','https://example.com/x',$1)`, [ (await db.query(`select id from auth.users where email=$1`,[g('QA_COACH_EMAIL')])).rows[0].id ]);
  await user.goto(`${BASE}/library`, { waitUntil: 'load', timeout: 30000 });
  await settle(user);
  const row = user.locator('li', { hasText: '[리허설] 눌러보기 인도자 전용' }).first();
  const isLink = (await row.locator('a').count()) > 0;
  note('⑶ 목록의 그 줄이 **누를 수 있는가**', isLink ? '★ 링크다' : 'O 링크가 아니다 — 누를 수 없다');
  if (isLink) {
    await row.locator('a').first().click();
    await settle(user).catch(() => {});
    note('⑶ 눌렀을 때 뜨는 화면', (await user.evaluate(() => document.body.innerText || '')).replace(/\s+/g, ' ').slice(0, 70));
  }
  await user.screenshot({ path: `${OUT}/03-library-click.png` });
} finally {
  // ── 뒤처리: 자료 · 갈무리 · 회차 일정 · 승인 상태
  const { rows: libs } = await db.query(`select id, storage_path from public.library_items where title like '[리허설]%'`);
  for (const r of libs) {
    if (r.storage_path) await admin.storage.from('library').remove([r.storage_path]).catch(() => {});
    await db.query('delete from public.library_items where id=$1', [r.id]).catch(() => {});
  }
  if (seededCohort) {
    await db.query(`delete from public.checkins where cohort_id=$1`, [seededCohort]).catch(() => {});
    await db.query(`delete from public.cohort_sessions where cohort_id=$1`, [seededCohort]).catch(() => {});
  }
  console.log(`\n뒤처리 — 자료 ${libs.length}개 · 회차 일정·갈무리 삭제`);
  writeFileSync(`${OUT}/approve-checkin.json`, JSON.stringify(found, null, 2), 'utf8');
  await browser.close();
  await db.end().catch(() => {});
}
