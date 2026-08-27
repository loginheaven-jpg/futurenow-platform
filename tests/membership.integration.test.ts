// 회원 상태 진실표 (실DB · S-1 단계 4 · ADR-122)
//
// **이 파일이 이 발주의 무게중심이다.** "판정은 SQL 한 곳에 있다"는 것은 설계의 약속이고,
//   진실표가 서야 증명된다. 그 전까지는 주장일 뿐이다.
//
// 기본 SKIP — 실DB 연결이 필요하므로 명시적 옵트인일 때만 돈다:
//   RUN_RLS_INTEGRATION=1 SUPABASE_DB_URL="postgres://...:5432/postgres" npm test
// 모든 검증은 단일 트랜잭션에서 하고 끝에 ROLLBACK 한다(영속 0). rls.integration 과 같은 규약이다.
import { describe, it, expect } from 'vitest';
import { Client } from 'pg';
import { countAs, expectRaise, runAs, scalarAs, updateCountAs } from './helpers/asRole';
import { ACCESS_KINDS, ACCESS_TABLE, PRIORITY_CASES, expectedAccess } from './fixtures/membershipAccess';

const ENABLED = process.env.RUN_RLS_INTEGRATION === '1' && !!process.env.SUPABASE_DB_URL;

const MEMBER = '22222222-2222-2222-2222-222222222222';
const COACH_A = '11111111-1111-1111-1111-111111111111';
const COACH_B = '33333333-3333-3333-3333-333333333333';
const ADMIN = '44444444-4444-4444-4444-444444444444';
const COHORT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

// 세미나 차수 하나 + 네 역할. cohorts.kind 는 DEFAULT 'seminar' 라 명시하지 않는다 —
//   기본값이 곧 판정의 축임을 픽스처가 함께 증명한다.
const SETUP = `
set local session_replication_role = replica;
-- auth.users 를 먼저 심는다 — public.users.id 가 auth.users(id) 를 참조한다.
-- replica 모드가 FK 를 건너뛰어 행은 들어가지만, **뒤이은 정상 UPDATE 가 그 FK 를 다시 검사해** 터진다.
-- 같은 replica 창 안이라 handle_new_user 트리거도 돌지 않는다.
insert into auth.users (id, email) values
 ('11111111-1111-1111-1111-111111111111','t0@t.test'),
 ('22222222-2222-2222-2222-222222222222','t1@t.test'),
 ('33333333-3333-3333-3333-333333333333','t2@t.test'),
 ('44444444-4444-4444-4444-444444444444','t3@t.test');
insert into public.users (id,email,name,nickname,role) values
 ('${COACH_A}','coachA@t.test','CoachA','ca','coach'),
 ('${MEMBER}','memberM@t.test','MemberM','mm','user'),
 ('${COACH_B}','coachB@t.test','CoachB','cb','coach'),
 ('${ADMIN}','admin@t.test','Admin','ad','admin');
insert into public.cohorts (id,coach_id,instrument_id,name,code,status,max_members) values
 ('${COHORT}','${COACH_A}','__mstest__','MS','MSTUV','active',10);
insert into public.enrollments (cohort_id,user_id) values ('${COHORT}','${MEMBER}');
set local session_replication_role = origin;
`;

/** 인도자·운영자까지 같은 세미나 차수에 등록 — 역할별 검증용. */
const ENROLL_STAFF = `insert into public.enrollments (cohort_id,user_id) values
 ('${COHORT}','${COACH_A}'), ('${COHORT}','${ADMIN}');`;

/** memberships 행을 직접 심는다. authenticated 는 쓰기가 막혀 있으므로 소유자 권한으로 넣는다. */
function seed(user: string, status: string, validUntil: string | null): string {
  const vu = validUntil === null ? 'null' : `date '${validUntil}'`;
  return `insert into public.memberships (user_id,status,valid_until,decided_at,decision_note)
          values ('${user}','${status}',${vu},now(),'fixture')
          on conflict (user_id) do update set status=excluded.status, valid_until=excluded.valid_until`;
}

async function open(): Promise<Client> {
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await client.connect();
  await client.query('begin');
  await client.query(SETUP);
  return client;
}

async function close(client: Client): Promise<void> {
  await client.query('rollback');
  await client.end();
}

const stateOf = (c: Client, u: string) => scalarAs(c, u, `select public.member_state('${u}') as s`);

describe.skipIf(!ENABLED)('회원 상태 판정 (실DB · 역할별)', () => {
  it('member_state 우선순위가 픽스처와 한 칸도 어긋나지 않는다', async () => {
    const client = await open();
    try {
      for (const c of PRIORITY_CASES) {
        await client.query('savepoint pc');
        if (!c.seminarEnrolled) await client.query(`delete from public.enrollments where user_id='${MEMBER}'`);
        if (c.stored !== null) {
          const vu = c.stored === 'individual' ? (c.expiredDate ? '2000-01-01' : '2099-12-31') : null;
          await client.query(seed(MEMBER, c.stored, vu));
        }
        expect(await stateOf(client, MEMBER), `${c.label} — ${c.why}`).toBe(c.expect);
        await client.query('rollback to savepoint pc');
        await client.query('release savepoint pc');
      }
    } finally { await close(client); }
  });

  it('held 가 cohort 를 이긴다 — 참여자·인도자·운영자 모두', async () => {
    // 자동 전이에 role 필터를 걸지 않기로 한 결정(초안 §3-⑤)과 맞물리는 자리다.
    // 인도자·운영자도 세미나 차수에 등록될 수 있고, 그때도 운영자 판단이 이겨야 한다.
    // 이기지 않으면 차수에 등록되는 것만으로 보류가 무력화된다 — 코드 한 줄로 게이트를 뚫는 길이 생긴다.
    const client = await open();
    try {
      await client.query(ENROLL_STAFF);
      for (const [who, label] of [[MEMBER, '참여자'], [COACH_A, '인도자'], [ADMIN, '운영자']] as const) {
        await client.query('savepoint hp');
        expect(await stateOf(client, who), `${label} — 등록만`).toBe('cohort');
        await client.query(seed(who, 'held', null));
        expect(await stateOf(client, who), `${label} — held 가 이겨야 한다`).toBe('held');
        await client.query('rollback to savepoint hp');
        await client.query('release savepoint hp');
      }
    } finally { await close(client); }
  });

  it('member_can_assess 가 진실표와 일치한다 — 화면 표시 매핑이 볼 같은 표', async () => {
    // 단계 5의 앱 레이어 순수 함수가 ACCESS_TABLE 을 그대로 본다. 둘이 갈리는 날 여기가 먼저 레드가 된다.
    const client = await open();
    try {
      for (const row of ACCESS_TABLE) {
        await client.query('savepoint ac');
        if (row.state !== 'cohort') {
          await client.query(`delete from public.enrollments where user_id='${MEMBER}'`);
          if (row.state === 'individual') await client.query(seed(MEMBER, 'individual', '2099-12-31'));
          else if (row.state === 'expired') await client.query(seed(MEMBER, 'individual', '2000-01-01'));
          else if (row.state === 'held') await client.query(seed(MEMBER, 'held', null));
          // pending = 행 없음
        }
        expect(await stateOf(client, MEMBER), row.why).toBe(row.state);
        for (const kind of ACCESS_KINDS) {
          const got = await scalarAs(client, MEMBER, `select public.member_can_assess('${MEMBER}','${kind}') as b`);
          expect(got === 'true', `${row.state} × ${kind} — ${row.why}`).toBe(expectedAccess(row.state, kind));
        }
        await client.query('rollback to savepoint ac');
        await client.query('release savepoint ac');
      }
    } finally { await close(client); }
  });

  it('member_can_assess 가 계열 이름을 검증한다', async () => {
    const client = await open();
    try {
      await expectRaise(client, MEMBER, `select public.member_can_assess('${MEMBER}','both')`, '22023');
      await expectRaise(client, MEMBER, `select public.member_can_assess('${MEMBER}','')`, '22023');
    } finally { await close(client); }
  });

  it('member_state 는 남의 상태를 아무나 묻지 못하게 한다', async () => {
    const client = await open();
    try {
      await expectRaise(client, COACH_A, `select public.member_state('${MEMBER}')`, '42501'); // 같은 차수 인도자도 안 된다
      await expectRaise(client, COACH_B, `select public.member_state('${MEMBER}')`, '42501');
      expect(await stateOf(client, MEMBER)).toBe('cohort');                                    // 본인은 된다
      expect(await scalarAs(client, ADMIN, `select public.member_state('${MEMBER}') as s`)).toBe('cohort'); // 운영자도 된다
    } finally { await close(client); }
  });

  it('세미나가 아닌 차수는 cohort 를 만들지 않는다 — kind 가 판정의 축이다', async () => {
    const client = await open();
    try {
      expect(await stateOf(client, MEMBER)).toBe('cohort');
      for (const kind of ['general', 'trash', 'test']) {
        await client.query('savepoint kd');
        await client.query(`update public.cohorts set kind='${kind}' where id='${COHORT}'`);
        expect(await stateOf(client, MEMBER), `kind=${kind}`).toBe('pending');
        await client.query('rollback to savepoint kd');
        await client.query('release savepoint kd');
      }
    } finally { await close(client); }
  });
});

describe.skipIf(!ENABLED)('운영자 결정과 승인 큐 (실DB)', () => {
  it('decide_membership 가드 — 자기 자신·비운영자·화이트리스트·기간 오용·부재 대상', async () => {
    const client = await open();
    try {
      await expectRaise(client, ADMIN, `select public.decide_membership('${ADMIN}','held',null,null)`, '42501');
      await expectRaise(client, COACH_A, `select public.decide_membership('${MEMBER}','held',null,null)`, '42501');
      await expectRaise(client, MEMBER, `select public.decide_membership('${MEMBER}','held',null,null)`, '42501');
      // 산출값·초기 상태는 결정 대상이 아니다.
      await expectRaise(client, ADMIN, `select public.decide_membership('${MEMBER}','cohort',null,null)`, '22023');
      await expectRaise(client, ADMIN, `select public.decide_membership('${MEMBER}','pending',null,null)`, '22023');
      // 기간은 개인 회원 승인에만 붙는다.
      await expectRaise(client, ADMIN, `select public.decide_membership('${MEMBER}','held',date '2099-01-01',null)`, '22023');
      await expectRaise(client, ADMIN, `select public.decide_membership('00000000-0000-0000-0000-000000000000','held',null,null)`, 'P0002');

      await runAs(client, ADMIN, `select public.decide_membership('${COACH_B}','individual',date '2099-12-31','승인')`);
      const r = await client.query(`select status, valid_until, decided_by, decision_note from public.memberships where user_id='${COACH_B}'`);
      expect(r.rows[0].status).toBe('individual');
      expect(String(r.rows[0].decided_by)).toBe(ADMIN);
      expect(r.rows[0].decision_note).toBe('승인');
    } finally { await close(client); }
  });

  it('승인 큐 — 운영자 전용 · 창 경계 양쪽 · valid_until NULL 제외 · 만료분 제외', async () => {
    const client = await open();
    try {
      await client.query(`delete from public.enrollments where user_id='${MEMBER}'`); // cohort 면 큐에 뜨지 않는다

      await expectRaise(client, COACH_A, `select * from public.list_membership_queue(30)`, '42501');
      await expectRaise(client, MEMBER, `select * from public.list_membership_queue(30)`, '42501');
      await expectRaise(client, ADMIN, `select * from public.list_membership_queue(-1)`, '22023');
      await expectRaise(client, ADMIN, `select * from public.list_membership_queue(366)`, '22023');

      const bucketOf = () =>
        scalarAs(client, ADMIN,
          `select coalesce((select bucket from public.list_membership_queue(30) where user_id='${MEMBER}'),'-') as b`);

      expect(await bucketOf(), '행 없음 → 대기 갈래').toBe('pending');

      await client.query(seed(MEMBER, 'individual', null));
      expect(await bucketOf(), 'valid_until NULL(체험 백필분) → 창에 들지 않는다').toBe('-');

      await client.query(`update public.memberships set valid_until = (public.membership_today() + 30) where user_id='${MEMBER}'`);
      expect(await bucketOf(), '창 안쪽 경계 +30일').toBe('expiring');

      await client.query(`update public.memberships set valid_until = (public.membership_today() + 31) where user_id='${MEMBER}'`);
      expect(await bucketOf(), '창 바깥 경계 +31일').toBe('-');

      await client.query(`update public.memberships set valid_until = (public.membership_today() - 1) where user_id='${MEMBER}'`);
      expect(await bucketOf(), '이미 만료 → 임박이 아니다').toBe('-');
    } finally { await close(client); }
  });

  it('승인 큐가 유효기간 기본값을 실어 보낸다 — TS 가 개월수를 모르게', async () => {
    const client = await open();
    try {
      await client.query(`delete from public.enrollments where user_id='${MEMBER}'`);
      const got = await scalarAs(client, ADMIN,
        `select (select default_valid_until from public.list_membership_queue(30) where user_id='${MEMBER}') as d`);
      const want = (await client.query(
        `select (public.membership_today() + (public.membership_default_months() || ' months')::interval)::date as d`,
      )).rows[0].d;
      expect(got).toBe(String(want));
    } finally { await close(client); }
  });
});

describe.skipIf(!ENABLED)('자동 전이와 쓰기 봉쇄 (실DB)', () => {
  it('마감 시 생성 · individual 불연장 · held 불변 · 재실행 멱등 · role 무필터', async () => {
    const client = await open();
    try {
      await client.query(ENROLL_STAFF);
      await client.query(seed(COACH_A, 'individual', '2030-01-01')); // 연장되면 안 된다
      await client.query(seed(ADMIN, 'held', null));                 // 뒤집히면 안 된다

      await client.query(`update public.cohorts set status='archived' where id='${COHORT}'`);

      // 여기도 ::text 로 받는다 — 한쪽만 캐스팅하면 Date 와 문자열을 비교하게 된다.
      const exp: string = (await client.query(
        `select ((public.membership_today() + (public.membership_default_months() || ' months')::interval)::date)::text as d`,
      )).rows[0].d;
      // pg 는 date 를 JS Date 로 돌려준다 — String(date) 이 'Tue Jan 01 2030 …' 이라 문자열 비교가 어긋난다.
      //   SQL 에서 text 로 캐스팅해 받는다(로컬 타임존이 끼어들 여지도 함께 없앤다).
      const row = async (u: string) =>
        (await client.query(
          `select status, valid_until::text as valid_until, decided_by from public.memberships where user_id='${u}'`,
        )).rows[0];

      // role 필터를 걸지 않았으므로 참여자·인도자·운영자가 모두 대상이다.
      expect((await row(MEMBER)).status).toBe('individual');
      expect((await row(MEMBER)).valid_until).toBe(exp);
      expect((await row(MEMBER)).decided_by).toBeNull(); // 결정한 사람이 없다 — 수료는 사실이다
      expect((await row(COACH_A)).valid_until, '기존 individual 은 연장되지 않는다').toBe('2030-01-01');
      expect((await row(ADMIN)).status, 'held 는 트리거가 뒤집지 않는다').toBe('held');

      const before = (await client.query(`select count(*)::int as c from public.memberships`)).rows[0].c;
      await client.query(`update public.cohorts set status='archived' where id='${COHORT}'`);
      const after = (await client.query(`select count(*)::int as c from public.memberships`)).rows[0].c;
      expect(after, '재실행 멱등').toBe(before);
      expect((await row(COACH_A)).valid_until).toBe('2030-01-01');
    } finally { await close(client); }
  });

  it('마감된 세미나 차수는 cohort 가 아니고, 트리거가 만든 individual 이 답이 된다', async () => {
    const client = await open();
    try {
      expect(await stateOf(client, MEMBER)).toBe('cohort');
      await client.query(`update public.cohorts set status='archived' where id='${COHORT}'`);
      expect(await stateOf(client, MEMBER), '수료자가 잠기지 않는다').toBe('individual');
    } finally { await close(client); }
  });

  it('세미나가 아닌 차수의 마감은 자동 전이를 일으키지 않는다', async () => {
    const client = await open();
    try {
      await client.query(`update public.cohorts set kind='general' where id='${COHORT}'`);
      await client.query(`update public.cohorts set status='archived' where id='${COHORT}'`);
      const n = (await client.query(`select count(*)::int as c from public.memberships where user_id='${MEMBER}'`)).rows[0].c;
      expect(n).toBe(0);
    } finally { await close(client); }
  });

  it('memberships 직접 쓰기가 역할 전부에서 막힌다 · 읽기는 본인과 운영자만', async () => {
    const client = await open();
    try {
      for (const who of [MEMBER, COACH_A, ADMIN]) {
        await expectRaise(client, who, `insert into public.memberships (user_id,status) values ('${who}','individual')`, '42501');
      }
      await client.query(seed(MEMBER, 'pending', null));
      for (const who of [MEMBER, COACH_A, ADMIN]) {
        await expectRaise(client, who, `update public.memberships set status='individual' where user_id='${MEMBER}'`, '42501');
        await expectRaise(client, who, `delete from public.memberships where user_id='${MEMBER}'`, '42501');
      }
      const q = `select count(*)::int as count from public.memberships where user_id='${MEMBER}'`;
      expect(await countAs(client, MEMBER, q), '본인').toBe(1);
      expect(await countAs(client, COACH_A, q), '같은 차수 인도자도 못 본다').toBe(0);
      expect(await countAs(client, COACH_B, q), '타 인도자').toBe(0);
      expect(await countAs(client, ADMIN, q), '운영자').toBe(1);
    } finally { await close(client); }
  });

  it('cohorts.kind 는 아무도 UPDATE 할 수 없다 — 조원 자격을 조용히 없애는 경로', async () => {
    const client = await open();
    try {
      // 컬럼 권한 자체가 없으므로 운영자도 막힌다. kind 변경은 마이그레이션의 일이다.
      await expectRaise(client, COACH_A, `update public.cohorts set kind='trash' where id='${COHORT}'`, '42501');
      await expectRaise(client, ADMIN, `update public.cohorts set kind='trash' where id='${COHORT}'`, '42501');
      // updateCohort 가 쓰는 컬럼은 그대로 열려 있다.
      expect(await updateCountAs(client, COACH_A, `update public.cohorts set name='새 이름' where id='${COHORT}'`)).toBe(1);
    } finally { await close(client); }
  });
});

describe.skipIf(!ENABLED)('가치 카드 개인 응시 경로 (실DB · S-2)', () => {
  it('차수분과 개인분이 각각 한 행으로 따로 산다 — 부분 유니크 인덱스 양쪽', async () => {
    const client = await open();
    try {
      // 차수분
      await runAs(client, MEMBER, `select public.value_save_progress('${COHORT}','exploring','{"k":1}'::jsonb,null)`);
      // 개인분 — cohort_id NULL
      await runAs(client, MEMBER, `select public.value_save_progress(null,'exploring','{"k":9}'::jsonb,null)`);

      const n = async (where: string) =>
        Number((await client.query(`select count(*)::int as c from public.value_assessments where user_id='${MEMBER}' and ${where}`)).rows[0].c);
      expect(await n(`cohort_id = '${COHORT}'`), '차수분').toBe(1);
      expect(await n('cohort_id is null'), '개인분').toBe(1);
      expect(await n('true'), '둘이 공존한다').toBe(2);

      // 개인분 중복 차단 — **기존 복합 UNIQUE 로는 NULL 이 서로 구별돼 전혀 막히지 않았다.**
      await expectRaise(
        client, MEMBER,
        `insert into public.value_assessments (user_id,cohort_id,card_set_version,stage) values ('${MEMBER}',null,'v1','exploring')`,
        '42501', // authenticated 는 직접 INSERT 권한이 없다(권한이 먼저 걸린다)
      );
      let code: string | undefined;
      try {
        await client.query(
          `insert into public.value_assessments (user_id,cohort_id,card_set_version,stage) values ('${MEMBER}',null,'v1','exploring')`,
        );
      } catch (e) { code = (e as { code?: string }).code; }
      expect(code, '개인분 두 번째 행은 인덱스가 막는다').toBe('23505');

    } finally { await close(client); }
  });

  it('차수분 중복도 여전히 막힌다', async () => {
    const client = await open();
    try {
      await runAs(client, MEMBER, `select public.value_save_progress('${COHORT}','exploring','{}'::jsonb,null)`);
      let code: string | undefined;
      try {
        await client.query(
          `insert into public.value_assessments (user_id,cohort_id,card_set_version,stage) values ('${MEMBER}','${COHORT}','v1','exploring')`,
        );
      } catch (e) { code = (e as { code?: string }).code; }
      expect(code).toBe('23505');
    } finally { await close(client); }
  });

  it('이어쓰기가 두 갈래를 섞지 않는다', async () => {
    const client = await open();
    try {
      await runAs(client, MEMBER, `select public.value_save_progress('${COHORT}','exploring','{"k":1}'::jsonb,null)`);
      await runAs(client, MEMBER, `select public.value_save_progress(null,'exploring','{"k":9}'::jsonb,null)`);
      await runAs(client, MEMBER, `select public.value_save_progress(null,'exploring','{"k":99}'::jsonb,null)`);
      const k = async (where: string) =>
        (await client.query(`select progress->>'k' as k from public.value_assessments where user_id='${MEMBER}' and ${where}`)).rows[0].k;
      expect(await k('cohort_id is null'), '개인분만 갱신된다').toBe('99');
      expect(await k(`cohort_id = '${COHORT}'`), '차수분은 그대로다').toBe('1');
    } finally { await close(client); }
  });

  it('개인 응시도 응시 게이트를 지난다 — held 면 막힌다', async () => {
    const client = await open();
    try {
      await client.query(seed(MEMBER, 'held', null));
      await expectRaise(client, MEMBER, `select public.value_save_progress(null,'exploring','{}'::jsonb,null)`, '42501');
    } finally { await close(client); }
  });

  it('개인 응시는 차수 소속을 묻지 않는다 — 미등록 individual 도 연다', async () => {
    const client = await open();
    try {
      await client.query(`delete from public.enrollments where user_id='${MEMBER}'`);
      await client.query(seed(MEMBER, 'individual', '2099-12-31'));
      await runAs(client, MEMBER, `select public.value_save_progress(null,'exploring','{}'::jsonb,null)`);
      const c = Number((await client.query(`select count(*)::int as c from public.value_assessments where user_id='${MEMBER}' and cohort_id is null`)).rows[0].c);
      expect(c).toBe(1);
      // 같은 사람이 차수 경로로는 여전히 막힌다(두 게이트가 독립이다).
      await expectRaise(client, MEMBER, `select public.value_save_progress('${COHORT}','exploring','{}'::jsonb,null)`, 'P0001');
    } finally { await close(client); }
  });

  it('개인분은 인도자에게 보이지 않고 본인·운영자만 읽는다', async () => {
    const client = await open();
    try {
      await runAs(client, MEMBER, `select public.value_save_progress(null,'exploring','{}'::jsonb,null)`);
      const q = `select count(*)::int as count from public.value_assessments where cohort_id is null`;
      expect(await countAs(client, MEMBER, q), '본인').toBe(1);
      expect(await countAs(client, COACH_A, q), '같은 차수 인도자도 못 본다').toBe(0);
      expect(await countAs(client, COACH_B, q), '타 인도자').toBe(0);
      expect(await countAs(client, ADMIN, q), '운영자').toBe(1);
    } finally { await close(client); }
  });

  it('이동·삭제가 개인 행을 건드리지 않는다', async () => {
    const client = await open();
    try {
      await runAs(client, MEMBER, `select public.value_save_progress('${COHORT}','exploring','{}'::jsonb,null)`);
      await runAs(client, MEMBER, `select public.value_save_progress(null,'exploring','{}'::jsonb,null)`);
      await runAs(client, COACH_A, `select public.remove_cohort_member('${COHORT}','${MEMBER}')`);
      const n = Number((await client.query(`select count(*)::int as c from public.value_assessments where user_id='${MEMBER}'`)).rows[0].c);
      expect(n, '차수분만 지워지고 개인분은 남는다').toBe(1);
      const isNull = (await client.query(`select cohort_id is null as p from public.value_assessments where user_id='${MEMBER}'`)).rows[0].p;
      expect(isNull).toBe(true);
    } finally { await close(client); }
  });
});
