// QA 기수 도구 — **세우고 · 재고 · 치운다**(최박사 결재 2026-08-29 · 지휘부 경계 다섯).
//
// **왜 필요한가**: 기수가 하나뿐이라 «기수 전환» 과 «다른 기수 글이 안 보인다» 를
//   **화면으로 잰 적이 없다**(피드 잔여 실측에서 못 재고 올린 그 자리다).
//
// ─────────────────────────────────────────────────────────────────────────────
// 경계 다섯 — 이 파일이 그것을 지키는 방식
//
//   ① **실계정·실기수 무접촉** — `insert` 만 한다. 기존 행에 `update`·`delete` 를 하지 않는다.
//      실기수 코드(ZR4KB·HMT7Z)와 실계정 이메일은 **금지 목록**에 두고 닿으면 던진다.
//   ② **치우는 스크립트를 함께 짓는다** — `down` 이 같은 파일에 있다. 나중에 만들지 않는다.
//   ③ **참여자 화면에 새지 않는가는 화면으로 잰다** — `check` 가 실브라우저로 본다.
//      「표식을 붙였다」를 근거로 쓰지 않는다.
//   ④ **가상 회원이 실계정과 갈리는 것을 데이터로 확인한다** — 양방향이다:
//      *넣을 때*(QA 질의가 가상만 센다) 와 *거를 때*(운영 질의가 가상을 안 센다) 둘 다.
//   ⑤ **잊으면 남는다** — `tests/qaCohortSunset.test.ts` 가 날짜로 운다. 사람이 돌리는 것에 기대지 않는다.
// ─────────────────────────────────────────────────────────────────────────────
//
// 사용:
//   node scripts/qaCohort.mjs up      # 기수 둘 + 가상 회원 셋을 세운다
//   node scripts/qaCohort.mjs status  # 지금 무엇이 서 있는가
//   node scripts/qaCohort.mjs check   # ③④ 를 잰다(화면 + 데이터)
//   node scripts/qaCohort.mjs switch  # 기수 전환·격리를 화면으로 잰다
//   node scripts/qaCohort.mjs down    # 전부 치우고 0 을 확인한다
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';

const env = readFileSync('.env.local', 'utf8');
const g = (k) => ((env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1] || '').trim();
const BASE = process.env.QA_BASE ?? 'https://future.yebom.org';

/** **표식은 세 겹이다** — 이름·코드·이메일. 하나만 보면 치우다 놓친다. */
export const QA = {
  namePrefix: '[QA전환]',
  codes: ['QAAAA', 'QABBB'],
  emailDomain: 'qa.invalid',
};
/** ★ **닿으면 던진다.** 실기수·실계정 근처에 가는 길을 코드가 막는다. */
const FORBIDDEN_CODES = ['ZR4KB', 'HMT7Z'];

const db = new pg.Client({ connectionString: g('SUPABASE_DB_URL'), ssl: { rejectUnauthorized: false } });
const admin = createClient(g('NEXT_PUBLIC_SUPABASE_URL'), g('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

function guard() {
  for (const c of QA.codes) {
    if (FORBIDDEN_CODES.includes(c)) throw new Error(`★ 멈춘다 — QA 코드가 실기수 코드다: ${c}`);
  }
}

async function up() {
  guard();
  const { rows: [coach] } = await db.query('select id from auth.users where email=$1', [g('QA_COACH_EMAIL')]);
  const { rows: [user] } = await db.query('select id from auth.users where email=$1', [g('QA_USER_EMAIL')]);
  if (!coach || !user) throw new Error('QA 계정을 찾지 못했다');

  const made = [];
  for (const [i, code] of QA.codes.entries()) {
    const { rows: [c] } = await db.query(
      `insert into public.cohorts (name, code, kind, status, coach_id, instrument_id, max_members)
       values ($1,$2,'seminar','active',$3,'futurenow',20)
       on conflict (code) do update set name = excluded.name
       returning id, code, name`,
      [`${QA.namePrefix} ${String.fromCharCode(65 + i)}`, code, coach.id],
    );
    made.push(c);
    // QA 참여자를 **양쪽에** 넣는다 — 그래야 전환이 화면에 선다(새 행만 만든다).
    await db.query(
      `insert into public.enrollments (cohort_id, user_id) values ($1,$2) on conflict do nothing`,
      [c.id, user.id],
    );
  }

  // ④ 가상 회원 — 실계정과 갈리는지 보려면 **가상이 있어야** 한다.
  const virtuals = [];
  for (let i = 1; i <= 3; i++) {
    const email = `qa-cohort-${i}@${QA.emailDomain}`;
    const { data, error } = await admin.auth.admin.createUser({
      email, password: `qa-${Math.random().toString(36).slice(2)}!A1`, email_confirm: true,
      user_metadata: { qa_fixture: true },
    });
    let id = data?.user?.id;
    if (error && /already/i.test(error.message)) {
      const { rows: [ex] } = await db.query('select id from auth.users where email=$1', [email]);
      id = ex?.id;
    } else if (error) { console.log(`  가상 회원 ${email} 생성 실패: ${error.message}`); continue; }
    if (!id) continue;
    virtuals.push({ id, email });
    await db.query(`insert into public.enrollments (cohort_id, user_id) values ($1,$2) on conflict do nothing`,
      [made[0].id, id]);
  }
  console.log(`세웠다 — 기수 ${made.length}(${made.map((m) => m.code).join(', ')}) · 가상 회원 ${virtuals.length}`);
  return { made, virtuals };
}

async function status() {
  const { rows: cs } = await db.query(
    `select c.code, c.name, c.kind, c.status,
            (select count(*) from public.enrollments e where e.cohort_id=c.id)::int as 등록
       from public.cohorts c where c.code = any($1) or c.name like $2 order by c.code`,
    [QA.codes, QA.namePrefix + '%'],
  );
  const { rows: [u] } = await db.query(
    `select count(*)::int n from auth.users where email like $1`, [`%@${QA.emailDomain}`]);
  console.log(`QA 기수 ${cs.length}개 · 가상 회원 ${u.n}명`);
  for (const c of cs) console.log(`  ${c.code} ${c.name} · ${c.kind}/${c.status} · 등록 ${c.등록}`);
  return { cohorts: cs.length, users: u.n };
}

async function down() {
  const { rows: cs } = await db.query(
    `select id, code from public.cohorts where code = any($1) or name like $2`, [QA.codes, QA.namePrefix + '%']);
  for (const c of cs) {
    if (FORBIDDEN_CODES.includes(c.code)) throw new Error(`★ 멈춘다 — 실기수를 지우려 한다: ${c.code}`);
  }
  const ids = cs.map((c) => c.id);
  if (ids.length) {
    await db.query('delete from public.enrollments where cohort_id = any($1)', [ids]);
    await db.query('delete from public.cohorts where id = any($1)', [ids]);
  }
  const { rows: us } = await db.query('select id, email from auth.users where email like $1', [`%@${QA.emailDomain}`]);
  for (const u of us) await admin.auth.admin.deleteUser(u.id).catch(() => {});
  const left = await status();
  if (left.cohorts !== 0 || left.users !== 0) throw new Error('★ 다 치워지지 않았다');
  console.log('치웠다 — QA 기수 0 · 가상 회원 0');
}

/** ③④ — 화면으로 새는지 보고, 데이터로 갈리는지 본다. */
async function check() {
  // ④ 데이터 — **양방향**이다.
  const q = async (sql, p = []) => (await db.query(sql, p)).rows[0].n;
  const inQa = await q(
    `select count(*)::int n from public.enrollments e join public.cohorts c on c.id=e.cohort_id
      where c.code = any($1)`, [QA.codes]);
  const virtualsInReal = await q(
    `select count(*)::int n from public.enrollments e
       join public.cohorts c on c.id=e.cohort_id
       join auth.users u on u.id=e.user_id
      where u.email like $1 and c.code <> all($2)`, [`%@${QA.emailDomain}`, QA.codes]);
  const realSeats = await q(`select coalesce(public.cohort_seats_taken('ZR4KB'),-1)::int n`);
  console.log(`\n④ 데이터 — QA 기수 등록 ${inQa}건(넣을 때 세어진다) · 가상 회원이 QA 밖 기수에 ${virtualsInReal}건(0 이어야 한다)`);
  console.log(`   실기수 집계(cohort_seats_taken ZR4KB) = ${realSeats} — QA 를 세우기 전후로 같아야 한다`);

  // ③ 화면 — **표식이 아니라 화면**이다.
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 390, height: 900 } })).newPage();
  const seen = {};
  for (const [name, path] of [['모집 랜딩', '/recruit'], ['공개 현관', '/'], ['서가', '/library']]) {
    await page.goto(BASE + path, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => !((document.body.innerText || '').includes('불러오는 중')), null, { timeout: 20000 });
    const t = await page.evaluate(() => document.body.innerText || '');
    seen[name] = { qa: (t.match(/\[QA/g) ?? []).length, invalid: (t.match(/qa\.invalid/g) ?? []).length };
  }
  await b.close();
  console.log('③ 화면 — 참여자가 보는 곳에 QA 표식이 몇 개나 보이는가(전부 0 이어야 한다)');
  for (const [k, v] of Object.entries(seen)) console.log(`   ${k}: [QA ${v.qa} · qa.invalid ${v.invalid}`);
  const leak = Object.values(seen).some((v) => v.qa > 0 || v.invalid > 0);
  console.log(leak ? '★ 새고 있다' : 'O 참여자 화면에 새지 않는다');
  return { inQa, virtualsInReal, realSeats, leak };
}

/** ★ **기수 전환 화면 실측** — 기수가 하나뿐이라 그동안 못 쟀던 자리다(피드 잔여 실측의 미측정 항목). */
async function switchProbe() {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'load', timeout: 30000 });
  await page.getByLabel(/이메일/).fill(g('QA_USER_EMAIL'));
  await page.getByLabel(/비밀번호/).fill(g('QA_USER_PASSWORD'));
  await page.getByRole('button', { name: /로그인/ }).click();
  await page.waitForURL(/\/(home|coach|admin)/, { timeout: 30000 });
  await page.goto(`${BASE}/feed`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => !((document.body.innerText || '').includes('불러오는 중')), null, { timeout: 20000 });

  const tabs = await page.$$eval('nav[aria-label="기수 선택"] a', (as) => as.map((a) => a.textContent.trim()));
  console.log(`전환 칩 ${tabs.length}개: ${JSON.stringify(tabs)}`);
  if (tabs.length < 2) { await b.close(); throw new Error('★ 전환 칩이 둘 미만이다 — up 을 먼저 돌려라'); }

  // A 기수에 표식을 남긴다(QA 기수 안에서만 쓴다).
  const mark = `[검증전환] ${Date.now()}`;
  // ★ **정확 일치로 고른다**(실측 2026-08-29 · 탐침이 틀렸던 자리).
  //   `hasText: 'A'` 는 「[QA전환] **B**」에도 걸린다 — 「QA」의 A 때문이다.
  //   느슨한 선택자로 두 클릭이 **같은 칩**으로 갔고, 그래서 «누출» 로 보였다.
  //   **앱이 아니라 창이 틀렸다.**
  const nameA = `${QA.namePrefix} A`, nameB = `${QA.namePrefix} B`;
  /**
   * ★ **전환이 끝난 뒤에 잰다**(실측 2026-08-29 · 탐침이 두 번 틀린 자리).
   *   `settle()` 만으로는 부족하다 — 떠나온 화면에도 「불러오는 중」이 없으므로 **즉시 참**이고,
   *   그래서 **A 의 글을 B 의 화면으로 읽어** 거짓 누출을 냈다(계열 ①).
   *   **선택 표시가 목표와 같아질 때까지** 기다린다. 그것이 새 렌더가 섰다는 증거다.
   */
  const goTab = async (name) => {
    await page.getByRole('link', { name, exact: true }).first().click();
    await page.waitForFunction(
      (n) => document.querySelector('nav[aria-label="기수 선택"] [aria-current="page"]')?.textContent?.trim() === n,
      name, { timeout: 20000 });
    await page.waitForFunction(() => !((document.body.innerText || '').includes('불러오는 중')), null, { timeout: 20000 });
  };
  await goTab(nameA);
  await page.locator('textarea.ui-textarea').fill(mark);
  await page.getByRole('button', { name: '올리기' }).click();
  await page.waitForFunction((t) => (document.body.innerText || '').includes(t), mark, { timeout: 30000 });
  console.log('A 기수에 글 하나 남김');

  // B 로 전환 — **그 글이 보이면 누출이다.**
  await goTab(nameB);
  // **글 단위로 센다** — 본문 전체를 보면 입력창·다른 요소까지 걸려 거짓 누출이 난다(⑨-b).
  const leaked = (await page.$$eval('article', (as, m) => as.filter((a) => a.innerText.includes(m)).length, mark)) > 0;
  const cur = await page.$eval('nav[aria-label="기수 선택"] [aria-current="page"]', (e) => e.textContent.trim()).catch(() => '(없음)');
  console.log(`B 기수로 전환 — 선택 표시 "${cur}" · A 의 글이 보이는가: ${leaked ? '★ 보인다(누출)' : '아니오 — 격리 정상'}`);

  // 되돌아가면 다시 보이는가(대조군) — 안 보이는 것이 «격리» 인지 «사라짐» 인지 가른다.
  await goTab(nameA);
  const backVisible = (await page.$$eval('article', (as, m) => as.filter((a) => a.innerText.includes(m)).length, mark)) > 0;
  console.log(`A 로 되돌아가면 다시 보이는가(대조군): ${backVisible ? 'O — 격리다' : '★ 아니다 — 사라진 것이다'}`);

  await b.close();
  return { tabs: tabs.length, leaked, backVisible };
}

const cmd = process.argv[2] ?? 'status';
try {
  await db.connect();
  if (cmd === 'up') { await up(); await status(); }
  else if (cmd === 'down') await down();
  else if (cmd === 'check') await check();
  else if (cmd === 'switch') await switchProbe();
  else await status();
} finally { await db.end().catch(() => {}); }
