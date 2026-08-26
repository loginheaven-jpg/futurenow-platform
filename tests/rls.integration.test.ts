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
import { countAs, expectRaise, runAs, updateCountAs } from './helpers/asRole';

const ENABLED = process.env.RUN_RLS_INTEGRATION === '1' && !!process.env.SUPABASE_DB_URL;

const SETUP = `
set local session_replication_role = replica;
-- auth.users 를 먼저 심는다 — public.users.id 가 auth.users(id) 를 참조한다.
-- replica 모드가 FK 를 건너뛰어 행은 들어가지만, **뒤이은 정상 UPDATE 가 그 FK 를 다시 검사해** 터진다
-- (set_user_role·decide_coach_application 이 여기서 실패했다). 같은 replica 창 안이라 handle_new_user 도 안 돈다.
insert into auth.users (id, email) values
 ('11111111-1111-1111-1111-111111111111','t0@t.test'),
 ('22222222-2222-2222-2222-222222222222','t1@t.test'),
 ('33333333-3333-3333-3333-333333333333','t2@t.test'),
 ('44444444-4444-4444-4444-444444444444','t3@t.test');
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

  it('cohorts_update RLS — 소유 코치만 수정, 타코치 차단(0행), coach_id 이전 차단(42501)', async () => {
    const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
    await client.connect();
    try {
      await client.query('begin');
      await client.query(SETUP); // COHORT 는 COACH_A 소유

      // 타코치(COACH_B)는 USING 불충족 → 0행 영향(에러 아님)
      expect(await updateCountAs(client, COACH_B, `update public.cohorts set name='해킹' where id='${COHORT}'`)).toBe(0);
      // 소유 코치(COACH_A) → 1행
      expect(await updateCountAs(client, COACH_A, `update public.cohorts set name='수정됨' where id='${COHORT}'`)).toBe(1);
      // coach_id 이전(COACH_A→COACH_B) → WITH CHECK 위반 → 42501
      await expectRaise(client, COACH_A, `update public.cohorts set coach_id='${COACH_B}' where id='${COHORT}'`, '42501');
    } finally {
      await client.query('rollback');
      await client.end();
    }
  });

  it('set_user_role — 운영자 승격 · 비운영자 거부 · 화이트리스트 · 자기강등 가드', async () => {
    const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
    await client.connect();
    try {
      await client.query('begin');
      await client.query(SETUP);

      // 운영자 승격: MemberM(user) → coach
      await runAs(client, ADMIN, `select public.set_user_role('${MEMBER}','coach')`);
      expect((await client.query(`select role from public.users where id='${MEMBER}'`)).rows[0].role).toBe('coach');

      // 비운영자(coach)는 거부 → 42501
      await expectRaise(client, COACH_A, `select public.set_user_role('${MEMBER}','user')`, '42501');

      // 역할 화이트리스트 위반 → 22023
      await expectRaise(client, ADMIN, `select public.set_user_role('${MEMBER}','superuser')`, '22023');

      // 자기강등 방지(admin→user) → 42501
      await expectRaise(client, ADMIN, `select public.set_user_role('${ADMIN}','user')`, '42501');

      // 뒷문 차단(Step 2.S2): 멤버 직접 update role → 컬럼 권한 거부(42501). 정문(set_user_role)은 위에서 동작 확인.
      await expectRaise(client, MEMBER, `update public.users set role='admin' where id='${MEMBER}'`, '42501');
      // name 직접 수정은 권한 유지(Step 2.5 대비) — 본인 행이라 통과(권한 거부 아님).
      await runAs(client, MEMBER, `update public.users set name='새이름' where id='${MEMBER}'`);
    } finally {
      await client.query('rollback');
      await client.end();
    }
  });
});

// ── 가치 카드(ADR-121) ───────────────────────────────────────────────────────
// 3차 검토 N-5: 읽기 축만으로는 쓰기 구멍이 안 잡힌다. **행동으로** 판정한다 —
//   카탈로그 한 줄(has_*_privilege)은 초록으로 통과하면서 RPC 가 금지 상태를 써 주는 구멍을 못 잡는다.
//   그래서 실제로 INSERT·UPDATE·RPC 를 때려 sqlstate 와 영향 행수를 본다.
describe.skipIf(!ENABLED)('RLS — value_assessments(ADR-121)', () => {
  const C8 = '[1,2,3,4,5,6,7,8]';
  const COHORT2 = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

  it('읽기 5축 — 본인/타인/같은차수코치/다른차수코치/운영자', async () => {
    const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
    await client.connect();
    try {
      await client.query('begin');
      await client.query(SETUP);
      await runAs(client, MEMBER, `select public.value_save_progress('${COHORT}','exploring','{}'::jsonb,null)`);
      const q = `select count(*) from public.value_assessments where cohort_id='${COHORT}'`;
      expect(await countAs(client, MEMBER, q)).toBe(1);
      expect(await countAs(client, COACH_A, q)).toBe(1);
      expect(await countAs(client, ADMIN, q)).toBe(1);
      expect(await countAs(client, COACH_B, q)).toBe(0);
    } finally { await client.query('rollback'); await client.end(); }
  });

  it('직접 쓰기가 회수됐다 — INSERT·UPDATE 권한 거부(42501) · TRUNCATE·anon 없음', async () => {
    const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
    await client.connect();
    try {
      await client.query('begin');
      await client.query(SETUP);
      await expectRaise(client, MEMBER,
        `insert into public.value_assessments (user_id,cohort_id,card_set_version) values ('${MEMBER}','${COHORT}','v1')`, '42501');
      await runAs(client, MEMBER, `select public.value_save_progress('${COHORT}','exploring','{}'::jsonb,null)`);
      await expectRaise(client, MEMBER,
        `update public.value_assessments set stage='final' where user_id='${MEMBER}'`, '42501');
      const r = await client.query(
        `select has_table_privilege('authenticated','public.value_assessments','TRUNCATE') as t,
                has_table_privilege('anon','public.value_assessments','SELECT') as a`);
      expect(r.rows[0].t).toBe(false);
      expect(r.rows[0].a).toBe(false);
    } finally { await client.query('rollback'); await client.end(); }
  });

  it('비멤버는 RPC 로도 남의 차수에 행을 심지 못한다 (B-1 세 번째)', async () => {
    const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
    await client.connect();
    try {
      await client.query('begin');
      await client.query(SETUP);
      // S-1 응시 게이트가 앞에 생겼다(member_can_assess). COACH_B 는 어느 차수에도 없어 상태가
      //   'pending' 이라 42501 로 먼저 막힌다 — **이 단언이 지키려던 것은 그것이 아니라 '차수 게이트'다.**
      //   레드가 났다고 단언을 지우지 않고, 상태 게이트를 통과시켜 원래 의도를 되살린다(ADR-111 처리와 같다).
      await client.query(
        `insert into public.memberships (user_id,status,valid_until,decided_at,decision_note)
         values ('${COACH_B}','individual','2099-12-31',now(),'fixture')`,
      );
      await expectRaise(client, COACH_B, `select public.value_save_progress('${COHORT}','exploring','{}'::jsonb,null)`, 'P0001');
      expect(await countAs(client, ADMIN, `select count(*) from public.value_assessments`)).toBe(0);
    } finally { await client.query('rollback'); await client.end(); }
  });

  it('stage 전진 도약과 역행이 둘 다 막힌다 (N-2)', async () => {
    const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
    await client.connect();
    try {
      await client.query('begin');
      await client.query(SETUP);
      await runAs(client, MEMBER, `select public.value_save_progress('${COHORT}','exploring','{}'::jsonb,null)`);
      // exploring 에서 곧바로 확정 시도 → 거부. 이것이 B-1 이 지목한 '탐색·비교 건너뛰기'다.
      await expectRaise(client, MEMBER, `select public.value_finalize('${COHORT}',1,2,3)`, 'P0001');
      await expectRaise(client, MEMBER, `select public.value_save_progress('${COHORT}','finalists','{}'::jsonb,'${C8}'::jsonb)`, 'P0001');
      await runAs(client, MEMBER, `select public.value_save_progress('${COHORT}','candidates','{}'::jsonb,'${C8}'::jsonb)`);
      await runAs(client, MEMBER, `select public.value_save_progress('${COHORT}','finalists','{}'::jsonb,null)`);
      await expectRaise(client, MEMBER, `select public.value_save_progress('${COHORT}','exploring','{}'::jsonb,null)`, 'P0001');
    } finally { await client.query('rollback'); await client.end(); }
  });

  it('개수 규칙을 서버가 강제한다 — 7장·13장 거부 (N-1)', async () => {
    const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
    await client.connect();
    try {
      await client.query('begin');
      await client.query(SETUP);
      await runAs(client, MEMBER, `select public.value_save_progress('${COHORT}','exploring','{}'::jsonb,null)`);
      await expectRaise(client, MEMBER,
        `select public.value_save_progress('${COHORT}','candidates','{}'::jsonb,'[1,2,3,4,5,6,7]'::jsonb)`, 'P0001');
      await expectRaise(client, MEMBER,
        `select public.value_save_progress('${COHORT}','candidates','{}'::jsonb,'[1,2,3,4,5,6,7,8,9,10,11,12,13]'::jsonb)`, 'P0001');
      await runAs(client, MEMBER, `select public.value_save_progress('${COHORT}','candidates','{}'::jsonb,'${C8}'::jsonb)`);
    } finally { await client.query('rollback'); await client.end(); }
  });

  it('확정 후 잠금 — 후보 밖 거부 · 재확정 거부 · 라벨은 계속 쓴다', async () => {
    const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
    await client.connect();
    try {
      await client.query('begin');
      await client.query(SETUP);
      await runAs(client, MEMBER, `select public.value_save_progress('${COHORT}','exploring','{}'::jsonb,null)`);
      await runAs(client, MEMBER, `select public.value_save_progress('${COHORT}','candidates','{}'::jsonb,'${C8}'::jsonb)`);
      await runAs(client, MEMBER, `select public.value_save_progress('${COHORT}','finalists','{}'::jsonb,null)`);
      await expectRaise(client, MEMBER, `select public.value_finalize('${COHORT}',1,2,99)`, 'P0001');
      await expectRaise(client, MEMBER, `select public.value_finalize('${COHORT}',1,1,2)`, 'P0001');
      await runAs(client, MEMBER, `select public.value_finalize('${COHORT}',1,2,3)`);
      await expectRaise(client, MEMBER, `select public.value_finalize('${COHORT}',4,5,6)`, 'P0001');
      await expectRaise(client, MEMBER, `select public.value_save_progress('${COHORT}','candidates','{}'::jsonb,'${C8}'::jsonb)`, 'P0001');
      // 안 넘긴 값은 보존된다(부분 갱신 시맨틱).
      await runAs(client, MEMBER, `select public.value_patch('${COHORT}','{"v1":"어제보다 나아지는 것"}'::jsonb,null,null)`);
      await runAs(client, MEMBER, `select public.value_patch('${COHORT}',null,null,'different')`);
      const r = await client.query(`select value1_label, alignment from public.value_assessments where user_id='${MEMBER}'`);
      expect(r.rows[0].value1_label).toBe('어제보다 나아지는 것');
      expect(r.rows[0].alignment).toBe('different');
    } finally { await client.query('rollback'); await client.end(); }
  });

  it('이중 등록자 이동이 unique 충돌 없이 완료된다 (N-3)', async () => {
    const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
    await client.connect();
    try {
      await client.query('begin');
      await client.query(SETUP);
      await client.query(`set local session_replication_role = replica;
        insert into public.cohorts (id,coach_id,instrument_id,name,code,status,max_members) values
         ('${COHORT2}','${COACH_A}','__rlstest__','RLS2','RSTU2','active',10);
        insert into public.enrollments (cohort_id,user_id) values ('${COHORT2}','${MEMBER}');
        set local session_replication_role = origin;`);
      await runAs(client, MEMBER, `select public.value_save_progress('${COHORT}','exploring','{}'::jsonb,null)`);
      await runAs(client, MEMBER, `select public.value_save_progress('${COHORT2}','exploring','{}'::jsonb,null)`);
      // 충돌 제거 절이 없으면 여기서 23505 로 함수 전체가 실패한다.
      await runAs(client, ADMIN, `select public.move_cohort_member('${MEMBER}','${COHORT}','${COHORT2}')`);
      const n = await client.query(`select count(*) from public.value_assessments where user_id='${MEMBER}'`);
      expect(Number(n.rows[0].count)).toBe(1);
    } finally { await client.query('rollback'); await client.end(); }
  });

  it('명단 영구 삭제가 가치 결과도 지운다', async () => {
    const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
    await client.connect();
    try {
      await client.query('begin');
      await client.query(SETUP);
      await runAs(client, MEMBER, `select public.value_save_progress('${COHORT}','exploring','{}'::jsonb,null)`);
      await runAs(client, COACH_A, `select public.remove_cohort_member('${COHORT}','${MEMBER}')`);
      const n = await client.query(`select count(*) from public.value_assessments where user_id='${MEMBER}'`);
      expect(Number(n.rows[0].count)).toBe(0);
    } finally { await client.query('rollback'); await client.end(); }
  });
});
