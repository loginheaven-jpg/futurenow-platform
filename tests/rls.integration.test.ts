// RLS 격리 통합 테스트 (역할별). 거점 DB 에 직접 연결해 실제 RLS 를 검증한다.
//
// 기본 SKIP — 실제 DB 연결이 필요하므로 명시적 옵트인일 때만 실행한다:
//   RUN_RLS_INTEGRATION=1 SUPABASE_DB_URL="postgres://...:5432/postgres" npm test
//
// 안전: 모든 픽스처/검증을 단일 트랜잭션에서 수행하고 끝에 ROLLBACK 한다(영속 0).
// session_replication_role=replica 로 auth.users FK 를 우회해 테스트 사용자를 만든다(롤백되므로 무영향).
// 각 역할은 set_config('request.jwt.claims', …) 로 시뮬레이션하고 role=authenticated 로 RLS 를 강제한다.
//
// 동일 매트릭스를 MCP/psql 로 1회 실측해 12/12 통과를 확인했다(2026-06-26). 이 파일은 반복 검증용.
import { describe, it, expect } from 'vitest';
import { Client } from 'pg';

const ENABLED = process.env.RUN_RLS_INTEGRATION === '1' && !!process.env.SUPABASE_DB_URL;

const SETUP = `
set local session_replication_role = replica;
insert into public.users (id,email,name,nickname,role) values
 ('11111111-1111-1111-1111-111111111111','coachA@t.test','CoachA','ca','coach'),
 ('22222222-2222-2222-2222-222222222222','memberM@t.test','MemberM','mm','user'),
 ('33333333-3333-3333-3333-333333333333','coachB@t.test','CoachB','cb','coach'),
 ('44444444-4444-4444-4444-444444444444','admin@t.test','Admin','ad','admin');
insert into public.cohorts (id,coach_id,instrument_id,name,code,status,max_members) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','__rlstest__','RLS','RSTUV','active',10);
insert into public.enrollments (cohort_id,user_id) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222');
insert into public.user_contacts (user_id,phone) values
 ('22222222-2222-2222-2222-222222222222','010-9999-0000');
insert into public.responses (id,instrument_id,cohort_id,user_id,wave,answers,subject_profile) values
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','__rlstest__','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222','pre','{}','{}');
insert into public.alerts (id,response_id,cohort_id,severity,reason) values
 ('cccccccc-cccc-cccc-cccc-cccccccccccc','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','care','test');
set local session_replication_role = origin;
`;

const MEMBER = '22222222-2222-2222-2222-222222222222';
const COACH_A = '11111111-1111-1111-1111-111111111111';
const COACH_B = '33333333-3333-3333-3333-333333333333';
const ADMIN = '44444444-4444-4444-4444-444444444444';
const COHORT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const APP = 'dddddddd-dddd-dddd-dddd-dddddddddddd'; // MemberM(user)의 코치 신청(pending)

// MemberM 의 코치 신청(pending). MemberM 은 SETUP 에서 role 'user' 로 생성됨 → 승인 시 'coach' 로 승격되는지 검증.
const APP_SETUP = `
insert into public.coach_applications (id,user_id,status,motivation,created_at)
 values ('${APP}','${MEMBER}','pending','이끌고 싶습니다', now());
`;

/** 주어진 sub(사용자)로 authenticated 역할을 시뮬레이션해 count 쿼리를 평가한다. */
async function countAs(client: Client, sub: string, sql: string): Promise<number> {
  await client.query(`set local role authenticated`);
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ sub, role: 'authenticated' }),
  ]);
  const r = await client.query(sql);
  await client.query(`reset role`);
  return Number(r.rows[0].count);
}

/** sub 로 authenticated 시뮬레이션해 문장을 실행(void). 실패 시 savepoint 로 트랜잭션 복구 후 throw(이후 검증 계속 가능). */
async function runAs(client: Client, sub: string, sql: string): Promise<void> {
  await client.query('savepoint sp');
  try {
    await client.query(`set local role authenticated`);
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub, role: 'authenticated' })]);
    await client.query(sql);
  } catch (e) {
    await client.query('rollback to savepoint sp');
    await client.query('release savepoint sp');
    throw e;
  }
  await client.query('reset role');
  await client.query('release savepoint sp');
}

/** 주어진 문장이 특정 sqlstate 로 raise 하는지 확인. */
async function expectRaise(client: Client, sub: string, sql: string, sqlstate: string): Promise<void> {
  let code: string | undefined;
  try {
    await runAs(client, sub, sql);
  } catch (e) {
    code = (e as { code?: string }).code;
  }
  expect(code).toBe(sqlstate);
}

describe.skipIf(!ENABLED)('RLS 격리 (실DB, 역할별)', () => {
  it('전화·응답·알림 가시성이 역할별로 의도대로 격리된다', async () => {
    const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
    await client.connect();
    try {
      await client.query('begin');
      await client.query(SETUP);

      const RESP = `select count(*)::int as count from public.responses where instrument_id='__rlstest__'`;
      const PHONE = `select count(*)::int as count from public.user_contacts where user_id='${MEMBER}'`;
      const ALERT = `select count(*)::int as count from public.alerts where cohort_id='${COHORT}'`;

      // 응답: 본인·같은차수코치·운영자 ○ / 타코치 ✕
      expect(await countAs(client, MEMBER, RESP)).toBe(1);
      expect(await countAs(client, COACH_A, RESP)).toBe(1);
      expect(await countAs(client, COACH_B, RESP)).toBe(0);
      expect(await countAs(client, ADMIN, RESP)).toBe(1);

      // 전화: 본인·운영자 ○ / 코치(같은차수 포함)·타인 ✕
      expect(await countAs(client, MEMBER, PHONE)).toBe(1);
      expect(await countAs(client, COACH_A, PHONE)).toBe(0);
      expect(await countAs(client, COACH_B, PHONE)).toBe(0);
      expect(await countAs(client, ADMIN, PHONE)).toBe(1);

      // 알림: 같은차수코치·운영자 ○ / 참여자 본인·타코치 ✕
      expect(await countAs(client, COACH_A, ALERT)).toBe(1);
      expect(await countAs(client, MEMBER, ALERT)).toBe(0);
      expect(await countAs(client, COACH_B, ALERT)).toBe(0);
      expect(await countAs(client, ADMIN, ALERT)).toBe(1);
    } finally {
      await client.query('rollback');
      await client.end();
    }
  });

  it('멤버명부·코치 승격 RPC 가 권한·멱등을 강제한다', async () => {
    const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
    await client.connect();
    try {
      await client.query('begin');
      await client.query(SETUP);
      await client.query(APP_SETUP);

      const DIR = `select count(*)::int as count from public.cohort_member_directory('${COHORT}')`;
      // 멤버명부: 차수 코치·운영자 ○ / 타코치·참여자 ✕
      expect(await countAs(client, COACH_A, DIR)).toBe(1);
      expect(await countAs(client, ADMIN, DIR)).toBe(1);
      expect(await countAs(client, COACH_B, DIR)).toBe(0);
      expect(await countAs(client, MEMBER, DIR)).toBe(0);

      // 승격 RPC: 비운영자 거부(42501)
      await expectRaise(client, COACH_A, `select public.decide_coach_application('${APP}','approved',null)`, '42501');

      // 운영자 승인 → 신청 approved + 사용자 user→coach 원자 승격
      await runAs(client, ADMIN, `select public.decide_coach_application('${APP}','approved','환영합니다')`);
      const appStatus = await client.query(`select status from public.coach_applications where id='${APP}'`);
      const memberRole = await client.query(`select role from public.users where id='${MEMBER}'`);
      expect(appStatus.rows[0].status).toBe('approved');
      expect(memberRole.rows[0].role).toBe('coach');

      // 재결정 거부(55000 already decided — 멱등 가드)
      await expectRaise(client, ADMIN, `select public.decide_coach_application('${APP}','rejected',null)`, '55000');
    } finally {
      await client.query('rollback');
      await client.end();
    }
  });

  it('cohorts_insert RLS — 코치는 자기 차수 생성 ○, 참여자는 차단(42501)', async () => {
    const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
    await client.connect();
    try {
      await client.query('begin');
      await client.query(SETUP);

      // 코치 본인 차수 생성 ○ (coach_id=auth.uid() AND user_role∈{coach,admin})
      await runAs(client, COACH_A, `insert into public.cohorts (coach_id,instrument_id,name,code) values ('${COACH_A}','__rlstest__','새 차수','ABCDE')`);
      const made = await client.query(`select count(*)::int as count from public.cohorts where code='ABCDE'`);
      expect(made.rows[0].count).toBe(1);

      // 참여자(user) 는 WITH CHECK 위반 → 42501
      await expectRaise(client, MEMBER, `insert into public.cohorts (coach_id,instrument_id,name,code) values ('${MEMBER}','__rlstest__','x','FGHJK')`, '42501');
    } finally {
      await client.query('rollback');
      await client.end();
    }
  });
});
