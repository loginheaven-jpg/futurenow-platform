// 3회차 SEED 실DB 검증. QA 회기·계정만, 전 과정 BEGIN/ROLLBACK.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import pg from 'pg';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => {
  const i = line.indexOf('=');
  return i > 0 ? [line.slice(0, i), line.slice(i + 1).trim().replace(/^"|"$/g, '')] : ['', ''];
}));
for (const k of ['SUPABASE_DB_URL', 'QA_COHORT_CODE', 'QA_USER_EMAIL', 'QA_COACH_EMAIL', 'QA_ADMIN_EMAIL']) assert(env[k], `Missing ${k}`);
assert(!['ZR4KB', 'HMT7Z', 'JOINF'].includes(env.QA_COHORT_CODE), 'Real cohort is forbidden');
const expected = ['think', 'speak', 'act'].flatMap((l) => ['start', 'expand', 'elim', 'down'].map((s) => `seed_${s}_${l}`));
const source = readFileSync('src/instruments/futurenow/checkin/session3.ts', 'utf8');
const start = source.indexOf('const SEED_3 =');
const end = source.indexOf('} satisfies SeedBlock;', start);
assert(start >= 0 && end > start, 'SEED declaration missing');
// 나눔 후보가 같은 키를 참조하므로 파일 전체가 아니라 실제 SEED 선언만 검사한다.
const keys = [...source.slice(start, end).matchAll(/key: '(seed_[^']+)'/g)].map((m) => m[1]);
assert.deepEqual(keys, expected);
const db = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
let begun = false;
try {
  await db.connect();
  await db.query('begin'); begun = true;
  await db.query("set local lock_timeout = '5s'");
  const cohort = (await db.query('select id from public.cohorts where code=$1', [env.QA_COHORT_CODE])).rows[0]?.id;
  const users = (await db.query('select id,email from auth.users where email=any($1)', [[env.QA_USER_EMAIL, env.QA_COACH_EMAIL, env.QA_ADMIN_EMAIL]])).rows;
  const id = (key) => users.find((u) => u.email === env[key])?.id;
  const user = id('QA_USER_EMAIL'), coach = id('QA_COACH_EMAIL'), admin = id('QA_ADMIN_EMAIL');
  assert(cohort && user && coach && admin, 'QA fixtures missing');
  assert.equal((await db.query('select public.is_cohort_member($1,$2) ok', [cohort, user])).rows[0].ok, true);
  assert.equal((await db.query('select count(*)::int n from public.cohort_sessions where cohort_id=$1 and session_no=3', [cohort])).rows[0].n, 1);
  const as = async (uid, sql, params = []) => {
    await db.query('reset role');
    await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: uid, role: 'authenticated' })]);
    await db.query('set local role authenticated');
    return db.query(sql, params);
  };
  const answers = Object.fromEntries(keys.map((k, i) => [k, `QA action ${i + 1}`]));
  Object.assign(answers, { habit_start: 'QA legacy start', habit_stop: 'QA legacy stop', speech_habit: 'QA legacy speech', step_what: 'QA next step' });
  await as(user, 'select public.checkin_save($1,3,$2::jsonb,$3::jsonb)', [cohort, JSON.stringify(answers), JSON.stringify({ stepPrivate: true })]);
  let row = (await as(user, 'select answers,step_private,has_content from public.checkins where cohort_id=$1 and session_no=3 and user_id=$2', [cohort, user])).rows[0];
  assert.deepEqual(row.answers, answers); assert.equal(row.has_content, true); assert.equal(row.step_private, true);
  await as(user, 'select public.checkin_save($1,3,$2::jsonb)', [cohort, JSON.stringify({ ...answers, seed_start_think: 'QA edited action' })]);
  await as(user, 'select public.checkin_submit($1,3)', [cohort]);
  row = (await as(user, 'select answers,step_private,submitted_at from public.checkins where cohort_id=$1 and session_no=3 and user_id=$2', [cohort, user])).rows[0];
  assert.equal(row.answers.seed_start_think, 'QA edited action'); assert.equal(row.answers.speech_habit, answers.speech_habit); assert.equal(row.step_private, true); assert(row.submitted_at);
  const count = 'select count(*)::int n from public.checkins where cohort_id=$1 and session_no=3 and user_id=$2';
  for (const [role, uid, n] of [['self', user, 1], ['coach', coach, 1], ['admin', admin, 1], ['stranger', '00000000-0000-4000-8000-00000000c0de', 0]]) {
    assert.equal((await as(uid, count, [cohort, user])).rows[0].n, n, role);
    console.log(`RLS ${role}: PASS`);
  }
  await db.query('reset role');
  const priv = (await db.query("select has_table_privilege('authenticated','public.checkins','INSERT') ins, has_table_privilege('authenticated','public.checkins','UPDATE') upd")).rows[0];
  assert.equal(priv.ins, false); assert.equal(priv.upd, false);
  console.log('PASS: 12 keys roundtrip, update, submit, legacy answers, private flag, direct-write permissions');
} finally {
  if (begun) await db.query('rollback');
  await db.end();
  console.log('ROLLBACK: QA writes removed; schema unchanged');
}
