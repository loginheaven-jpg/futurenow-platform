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
});
