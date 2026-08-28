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

/**
 * **적용된 마이그레이션 원장** — 새 기준 케이스를 건너뛸지 판정한다.
 *
 * 선례는 `tests/feedReactionsMulti.migration.test.ts` 다. **방향이 반대인 것에 주의한다** —
 *   그쪽: **이미 적용됐으면** 롤백 검증(적용 전 전용)을 건너뛴다.
 *   이쪽: **아직 적용 전이면** 새 기준 행을 건너뛴다.
 * 같은 도구를 반대 방향으로 쓰는 것이므로, 베낄 때 부호를 뒤집는 것을 잊지 말 것.
 *
 * **레드로 두지 않는 이유**: 표는 새 기준으로 앞서 있어도 되지만 테스트가 오래 빨가면
 * *원래 빨간 거야* 가 되고 그때 **진짜 결함이 들어와도 아무도 못 본다.**
 * 건너뛰되 **사유를 시끄럽게 출력**한다 — 건너뛴 것과 통과한 것은 다른 사실이다.
 */
const APPLIED_VERSIONS: ReadonlySet<string> = ENABLED ? await (async () => {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await c.connect();
  const rows = (await c.query('select version from supabase_migrations.schema_migrations')).rows;
  await c.end();
  return new Set<string>(rows.map((r: { version: string }) => r.version));
})() : new Set<string>();

const MEMBER = '22222222-2222-2222-2222-222222222222';
const COACH_A = '11111111-1111-1111-1111-111111111111';
const COACH_B = '33333333-3333-3333-3333-333333333333';
const ADMIN = '44444444-4444-4444-4444-444444444444';
const COHORT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
/**
 * **대조군 기수** — `MEMBER` 가 **속하지 않은** 세미나 기수(2026-08-30 신설).
 *
 * 차단 검증에 `false` 하나만 보면 *막혔다* 와 *원래 없다* 를 못 가른다.
 * 자기 기수(열림)와 이 기수(원래 닫힘)를 **함께** 재야 측정이 무엇을 쟀는지 말할 수 있다.
 */
const OTHER_COHORT = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

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
 ('${COHORT}','${COACH_A}','__mstest__','MS','MSTUV','active',10),
 -- 대조군 — MEMBER 를 등록하지 않는다. 같은 kind·status 라 **다른 조건이 소속뿐**이어야
 --   그 차이가 곧 측정의 뜻이 된다.
 ('${OTHER_COHORT}','${COACH_B}','__mstest__','MS-other','MSTHR','active',10);
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

/** 진실표 한 벌을 돈다. **재는 방식이 둘로 갈리지 않게** 두 테스트가 이것을 공유한다. */
async function runPriorityCases(cases: typeof PRIORITY_CASES): Promise<void> {
  const client = await open();
  try {
    for (const c of cases) {
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
}

describe.skipIf(!ENABLED)('회원 상태 판정 (실DB · 역할별)', () => {
  it('member_state 우선순위가 픽스처와 한 칸도 어긋나지 않는다', async () => {
    await runPriorityCases(PRIORITY_CASES.filter((c) => !c.needsMigration));
  });

  // **적용 대기 행은 별도 `it` 으로 가른다**(지휘부 판정 2026-08-30).
  //   앞서는 한 테스트 안 루프에서 `continue` + `console.log` 로 건너뛰었는데,
  //   **그러면 집계가 움직이지 않고 기본 리포터가 출력을 삼켜** 건너뛴 것이 통과로 보인다.
  //   `it.skipIf` 는 **스킵 수를 움직이고 리포터가 그것을 삼키지 않는다** —
  //   *시끄럽다* 의 정의를 출력이 아니라 **집계**로 옮긴 것이다.
  const GATED = PRIORITY_CASES.filter((c) => !!c.needsMigration);
  const GATED_READY = GATED.every((c) => APPLIED_VERSIONS.has(c.needsMigration!));
  it.skipIf(!GATED_READY || GATED.length === 0)(
    `member_state 진실표 — 적용 대기였던 ${GATED.length} 행`, async () => {
      await runPriorityCases(GATED);
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
          // **expired 는 이제 저장값으로만 만든다**(자동 만료 폐지 2026-08-30).
          //   옛 방법(`individual` + 지난 날짜)은 판정이 날짜를 보지 않게 되어 더는 통하지 않는다.
          //   *만드는 방법이 바뀌었을 뿐 재는 것은 같다* — expired 의 응시 가부는 그대로 ✕ 다.
          else if (row.state === 'expired') await client.query(seed(MEMBER, 'expired', null));
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

  // ── **만료 임박 갈래 폐지**(최박사 승인 2026-08-30 · `20260831090000`) ──────────────
  //
  //   앞선 판에서 이 자리는 *지난 날짜도 임박 갈래에 남는다* 를 단언하고 있었다.
  //   **그것은 물었어야 할 자리에서 테스트를 고쳐 초록을 만든 것이었다** — 자동 만료가
  //   폐지되며 임박이 뜻을 잃었는데, 뜻 없는 동작을 기준으로 삼아 잠가 버렸다.
  //
  //   최박사가 폐지를 확정했으므로 **갈래의 부재를 재는 쪽으로 뒤집는다.**
  //   지우지 않고 뒤집는 이유는 트리거 폐지를 다룬 아래 두 테스트와 같다 —
  //   *큐가 무엇을 담지 않는가* 를 아무도 재지 않으면 다음 사람이 갈래를 되살려도 조용하다.
  //
  //   **인자 형태가 마이그레이션 전후로 다르다.** 적용 전에는 `(30)`, 적용 후에는 `()` 다.
  //     적용 전 판은 `DEFAULT 30` 이라 `()` 로도 불리지만 **임박 행을 함께 준다** —
  //     즉 `()` 하나로 두 판을 다 덮으면 적용 전에 조용히 다른 것을 재게 된다(계열 ①~⑥).
  const QUEUE_MIGRATION = '20260831090000';
  const QUEUE_APPLIED = APPLIED_VERSIONS.has(QUEUE_MIGRATION);
  const QUEUE = QUEUE_APPLIED ? 'public.list_membership_queue()' : 'public.list_membership_queue(30)';

  it('승인 큐 — 운영자 전용 · 대기 갈래 · valid_until NULL 제외', async () => {
    const client = await open();
    try {
      await client.query(`delete from public.enrollments where user_id='${MEMBER}'`); // cohort 면 큐에 뜨지 않는다

      await expectRaise(client, COACH_A, `select * from ${QUEUE}`, '42501');
      await expectRaise(client, MEMBER, `select * from ${QUEUE}`, '42501');

      const bucketOf = () =>
        scalarAs(client, ADMIN,
          `select coalesce((select bucket from ${QUEUE} where user_id='${MEMBER}'),'-') as b`);

      expect(await bucketOf(), '행 없음 → 대기 갈래').toBe('pending');

      await client.query(seed(MEMBER, 'individual', null));
      expect(await bucketOf(), '판정이 individual 이면 큐에 없다').toBe('-');
    } finally { await close(client); }
  });

  // **조기 반환이 아니라 `skipIf` 다** — 건너뛴 것이 통과로 세어지면 초록의 뜻이 달라진다.
  it.skipIf(!QUEUE_APPLIED)('**만료 임박 갈래가 없다** — 폐지 확인 · 대조 쌍', async () => {
    const client = await open();
    try {
      await client.query(`delete from public.enrollments where user_id='${MEMBER}'`);
      const inQueue = () =>
        scalarAs(client, ADMIN,
          `select coalesce((select bucket from ${QUEUE} where user_id='${MEMBER}'),'-') as b`);

      // ① **대조군** — 대기인 사람은 큐에 뜬다. 이 한 줄이 *측정이 실제로 무언가를 잰다* 는 증거다.
      //    이것이 없으면 아래 `'-'` 가 *갈래가 없어서* 인지 *큐가 통째로 비어서* 인지 못 가른다.
      await client.query(`delete from public.memberships where user_id='${MEMBER}'`);
      expect(await inQueue(), '대조군 · 대기인 사람은 큐에 뜬다').toBe('pending');

      // ② 옛 임박 조건(창 안쪽 +30일)에 정확히 걸리는 행 — **이제 뜨지 않는다.**
      await client.query(seed(MEMBER, 'individual', null));
      await client.query(`update public.memberships set valid_until = (public.membership_today() + 30) where user_id='${MEMBER}'`);
      expect(await inQueue(), '창 안쪽 +30일 — 옛 판이라면 expiring 이었다').toBe('-');

      // ③ 지난 날짜도 마찬가지. **자격이 시간으로 꺾이지 않으므로 알릴 것이 없다.**
      await client.query(`update public.memberships set valid_until = (public.membership_today() - 1) where user_id='${MEMBER}'`);
      expect(await inQueue(), '지난 날짜 — 옛 판이라면 영영 임박에 남았을 행').toBe('-');

      // ④ **값은 지우지 않았다.** 없앤 것은 갈래이지 값이 아니다(최박사 못 박음).
      const vu = await scalarAs(client, ADMIN,
        `select (select valid_until::text from public.memberships where user_id='${MEMBER}') as v`);
      expect(vu, '갈래를 걷었다고 유효기간 값이 사라지면 되돌릴 수 없다').not.toBeNull();

      // ⑤ **창 인자가 사라졌다** — 옛 오버로드가 남아 있으면 갈래가 되살아날 문이 남는다.
      await expectRaise(client, ADMIN, `select * from public.list_membership_queue(30)`, '42883');
    } finally { await close(client); }
  });

  it('승인 큐가 유효기간 기본값을 실어 보낸다 — TS 가 개월수를 모르게', async () => {
    const client = await open();
    try {
      await client.query(`delete from public.enrollments where user_id='${MEMBER}'`);
      const got = await scalarAs(client, ADMIN,
        `select (select default_valid_until from ${QUEUE} where user_id='${MEMBER}') as d`);
      const want = (await client.query(
        `select (public.membership_today() + (public.membership_default_months() || ' months')::interval)::date as d`,
      )).rows[0].d;
      expect(got).toBe(String(want));
    } finally { await close(client); }
  });
});

describe('회원자격 보류 — 강퇴 모델 (실DB · ADR-152)', () => {
  // **최박사 확정 2026-08-30(모델 개정)**: 보류는 강퇴다. 로그인까지 막히고,
  //   운영자에게 거는 권한은 슈퍼어드민만 갖는다.
  //
  // ★★ **조건은 「이용 보류만 막는다」이지 「승인된 회원만 통과」가 아니다.** ★★
  //   `member_state(uid) <> 'expired'` 형태여야 한다. **실측**: 슈퍼어드민의 저장 상태가
  //   `pending` 이라 *승인된 회원만 통과* 로 쓰면 **슈퍼어드민이 첫 희생자가 되고
  //   그를 풀어 줄 사람이 없다.** 아래 `pending 운영자가 통과한다` 가 그것을 잰다.
  //
  // **`it.skipIf` 를 쓴다 — 조기 반환이 아니다.** 조기 반환 + `console.log` 는 기본 리포터에서
  //   출력이 삼켜져 **건너뛴 것이 통과로 세어진다**(실측). `skipIf` 는 스킵 수를 움직인다.
  const MIG = '20260831110000';
  const ON = ENABLED && APPLIED_VERSIONS.has(MIG);
  // 사유를 `console.log` 로 알리지 않는다 — 기본 리포터가 삼킨다. **스킵 수가 사유다.**

  it.skipIf(!ON)('★ **`pending` 운영자가 통과한다** — 조건을 승인 기준으로 쓰지 않았다', async () => {
    const client = await open();
    try {
      // 슈퍼어드민의 실제 상태가 이것이다. 여기서 `false` 가 나오면 **그를 풀 사람이 없다.**
      await client.query(seed(ADMIN, 'pending', null));
      expect(await scalarAs(client, ADMIN, `select public.is_admin('${ADMIN}')::text as s`),
        'pending 운영자가 막히면 조건을 「승인된 회원만」으로 쓴 것이다').toBe('true');
      // 대조군 — `expired` 는 막힌다. 이것이 없으면 위 초록이 *아무도 안 막힌다* 여도 통과한다.
      await client.query(seed(ADMIN, 'expired', null));
      expect(await scalarAs(client, ADMIN, `select public.is_admin('${ADMIN}')::text as s`),
        '대조군 · 보류는 막혀야 한다').toBe('false');
    } finally { await close(client); }
  });

  it.skipIf(!ON)('**대조 쌍 — 보류된 운영자 대 보류 안 된 운영자**', async () => {
    const client = await open();
    try {
      await client.query(`update public.users set role='admin' where id='${COACH_B}'`);
      const isAdmin = (u: string) => scalarAs(client, ADMIN, `select public.is_admin('${u}')::text as s`);
      expect(await isAdmin(ADMIN), '보류 전 · A').toBe('true');
      expect(await isAdmin(COACH_B), '보류 전 · B').toBe('true');
      await client.query(seed(ADMIN, 'expired', null));
      expect(await isAdmin(ADMIN), '보류 후 · A 가 꺼진다 — 이 변화가 곧 차단이다').toBe('false');
      expect(await isAdmin(COACH_B), '보류 후 · B 는 멀쩡하다 — 운영자 전체가 꺼진 것이 아니다').toBe('true');
      await client.query(`delete from public.memberships where user_id='${ADMIN}'`);
      expect(await isAdmin(ADMIN), '되돌리면 A 만 다시 켜진다').toBe('true');
    } finally { await close(client); }
  });

  it.skipIf(!ON)('**등가 잠금** — `member_state=expired` ⟺ `is_admin=false`', async () => {
    const client = await open();
    try {
      // 이 등가는 **「만료를 산출하지 않는다」에 기대고 있다**(ADR-147).
      //   누가 만료 산출을 되살리면 두 곳이 조용히 갈린다 — 그것을 여기서 잡는다.
      for (const status of ['expired', 'held', 'individual', 'pending'] as const) {
        await client.query(seed(ADMIN, status, null));
        const st = await scalarAs(client, ADMIN, `select public.member_state('${ADMIN}') as s`);
        const ad = await scalarAs(client, ADMIN, `select public.is_admin('${ADMIN}')::text as s`);
        expect(ad === 'false', `저장 ${status} · 판정 ${st} — 두 값이 갈렸다`).toBe(st === 'expired');
      }
    } finally { await close(client); }
  });

  it.skipIf(!ON)('**재귀가 없다** — 보류된 운영자로 `member_state` 를 불러도 값이 돌아온다', async () => {
    const client = await open();
    try {
      // `member_state` 가 열람 권한 검사에서 `is_admin` 을 부른다. 그 `is_admin` 이 다시
      //   `member_state` 를 불렀다면 **서로가 서로를 불러** 여기서 스택이 터졌을 것이다.
      await client.query(`delete from public.enrollments where user_id='${ADMIN}'`);
      await client.query(seed(ADMIN, 'expired', null));
      expect(await scalarAs(client, ADMIN, `select public.member_state('${ADMIN}') as s`)).toBe('expired');
    } finally { await close(client); }
  });

  it.skipIf(!ON)('**슈퍼어드민 상수가 한 곳에 있다** — 이메일이 코드에 박힌 자리는 하나다', async () => {
    const client = await open();
    try {
      // **실물은 둘이다**(2026-08-31 실측 · 이 테스트가 찾았다).
      //   `is_super_admin` — 이번에 만든 것. 슈퍼어드민 판정.
      //   `handle_new_user` — **예전부터 있던 것.** 가입 시 그 이메일이면 `role='admin'` 을 준다.
      //   목적이 다르지만 **상수는 같다** — 이메일이 바뀌면 **둘 다** 고쳐야 한다(불변식 23).
      //   그래서 개수가 아니라 **알려진 집합**을 잠근다. 셋째가 생기면 여기서 레드가 난다.
      const fns = (await client.query(
        `select p.proname from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
          where p.prosrc like '%loginheaven@gmail.com%' order by 1`)).rows.map((r: { proname: string }) => r.proname);
      expect(fns, '슈퍼어드민 이메일이 새로운 자리에 또 박혔다').toEqual(['handle_new_user', 'is_super_admin']);
      // 픽스처 계정은 슈퍼어드민이 아니다 — 대조군.
      expect(await scalarAs(client, ADMIN, `select public.is_super_admin('${ADMIN}')::text as s`)).toBe('false');
    } finally { await close(client); }
  });

  it.skipIf(!ON)('**가드 — 슈퍼어드민은 대상이 될 수 없고, 운영자 보류는 슈퍼어드민만**', async () => {
    const client = await open();
    try {
      // 일반 회원 보류는 운영자 누구나 한다 — **대조군**. 이것이 없으면 아래 42501 들이
      //   *아무도 아무것도 못 한다* 여도 통과한다.
      await runAs(client, ADMIN, `select public.decide_membership('${MEMBER}','expired',null,'사유')`);
      expect(await scalarAs(client, ADMIN,
        `select status as s from public.memberships where user_id='${MEMBER}'`)).toBe('expired');

      // 운영자를 보류 — 슈퍼어드민이 아니면 막힌다.
      await client.query(`update public.users set role='admin' where id='${COACH_B}'`);
      await expectRaise(client, ADMIN,
        `select public.decide_membership('${COACH_B}','expired',null,'사유')`, '42501');

      // 운영자를 `individual` 로 되돌리는 것은 막지 않는다 — 막으면 복구가 좁아진다.
      await runAs(client, ADMIN, `select public.decide_membership('${COACH_B}','individual',null,'복구')`);
      expect(await scalarAs(client, ADMIN,
        `select status as s from public.memberships where user_id='${COACH_B}'`)).toBe('individual');
    } finally { await close(client); }
  });

  it.skipIf(!ON)('**이미 열린 세션도 끊긴다** — 이것이 창을 0으로 만든다', async () => {
    const client = await open();
    try {
      // `banned_until` 은 **새 로그인과 갱신만** 막는다. 열린 세션을 두면 그 사람은
      //   갱신 시점까지 살아 있고, 그 창에서 **보류를 보지 않는 비운영자 쓰기 경로**
      //   (자기 자신 · 코치 소유)가 그대로 열려 있다. 그래서 세션을 함께 끊는다.
      await client.query(
        `insert into auth.sessions (id, user_id, created_at, updated_at)
         values (gen_random_uuid(), '${MEMBER}', now(), now())`);
      // **`scalarAs` 로 읽지 않는다** — 그것은 `authenticated` 로 역할을 바꾸는데
      //   `auth.sessions` 는 그 역할에 권한이 없다(실측: permission denied).
      //   **재는 자리가 권한을 못 가지면 재지 못한다** — 소유자 연결로 직접 읽는다.
      const sessions = async () => String((await client.query(
        `select count(*)::int as n from auth.sessions where user_id='${MEMBER}'`)).rows[0].n);
      expect(await sessions(), '대조군 · 끊기 전에는 세션이 있다').not.toBe('0');

      await runAs(client, ADMIN, `select public.decide_membership('${MEMBER}','expired',null,'사유')`);
      expect(await sessions(), '보류하면 열린 세션이 사라진다').toBe('0');

      // **되살리지 않는다** — 지운 것을 되돌릴 수 없고, 풀린 사람은 다시 로그인하면 된다.
      await runAs(client, ADMIN, `select public.decide_membership('${MEMBER}','individual',null,'복구')`);
      expect(await sessions(), '세션을 되살리려 들지 않는다').toBe('0');
    } finally { await close(client); }
  });

  it.skipIf(!ON)('**계정이 잠기고, 되돌리면 풀린다** — 푸는 것까지 재지 않으면 반쪽이다', async () => {
    const client = await open();
    try {
      // `auth.users` 도 같다 — `authenticated` 는 못 읽는다. 소유자 연결로 읽는다.
      const banned = async () => String((await client.query(
        `select coalesce((select banned_until::text from auth.users where id='${MEMBER}'),'-') as s`)).rows[0].s);
      expect(await banned(), '대조군 · 처음에는 잠겨 있지 않다').toBe('-');
      await runAs(client, ADMIN, `select public.decide_membership('${MEMBER}','expired',null,'사유')`);
      expect(await banned(), '보류하면 로그인이 막힌다').not.toBe('-');
      await runAs(client, ADMIN, `select public.decide_membership('${MEMBER}','individual',null,'복구')`);
      expect(await banned(), '되돌렸는데 로그인이 안 되면 되돌린 것이 아니다').toBe('-');
    } finally { await close(client); }
  });
});

describe.skipIf(!ENABLED)('cohorts_select — 미인증 가드 (실DB · ADR-149)', () => {
  // **상주로 둔다**(지휘부 지시 2026-08-30). 일회성 확인으로 끝내면 나중에 누가 `anon` 정책을
  //   추가할 때 **아무것도 울지 않는다.** 상주면 그때 레드가 되어 *의도적 변경임을 밝히도록* 강제된다.
  //
  // **`open()` 을 쓰지 않는다.** 그 헬퍼는 `SETUP` 을 돌리고 그 안에서 JWT 를 만진다 —
  //   같은 트랜잭션에 `request.jwt.claims` 가 남아 있으면 `auth.uid()` 가 NULL 이 아니고
  //   **미인증을 재는 것이 아니게 된다.** 실제로 한 번 그렇게 잘못 쟀다(계열 ①~⑥).
  //   그래서 **JWT 를 한 번도 설정하지 않은 깨끗한 연결**을 따로 연다.
  it('**`anon` 은 오류가 아니라 빈 결과를 받는다** — 함수 이름이 계획에 들어가지 않는다', async () => {
    const fresh = new Client({ connectionString: process.env.SUPABASE_DB_URL });
    await fresh.connect();
    try {
      await fresh.query('begin');
      await fresh.query('set local role anon');

      // ① **대조군** — 미인증이 실제로 미인증인지 먼저 확인한다. 이것이 NULL 이 아니면
      //    아래 `0행` 은 *가드가 통했다* 가 아니라 *다른 것을 쟀다* 는 뜻이다.
      const uid = (await fresh.query(`select auth.uid() as u`)).rows[0].u;
      expect(uid, '깨끗한 연결이어야 한다 — JWT 가 남아 있으면 미인증을 재는 것이 아니다').toBeNull();

      // ② **오류가 아니라 빈 결과.** `TO authenticated` 가 없으면 여기서 42501 이 난다
      //    (함수 EXECUTE 권한은 **실행 시점이 아니라 계획 시점**에 검사되므로,
      //     `CASE` 로 실행을 건너뛰어도 소용이 없다 — 실측으로 확인했다).
      const n = (await fresh.query(`select count(*)::int as n from public.cohorts`)).rows[0].n;
      expect(n, '미인증에게 기수가 보이면 안 된다').toBe(0);

      await fresh.query('rollback');
    } finally { await fresh.end(); }
  });

  it('**정책이 `TO authenticated` 로 서 있다** — 이 `TO` 를 지우면 위 테스트가 42501 로 터진다', async () => {
    const c = new Client({ connectionString: process.env.SUPABASE_DB_URL });
    await c.connect();
    try {
      const r = await c.query(`select polroles::regrole[]::text[] as roles
                                 from pg_policy
                                where polrelid='public.cohorts'::regclass and polname='cohorts_select'`);
      // `{-}` 는 PUBLIC(= `TO` 절 없음)이다. 그 상태로 돌아가면 미인증이 다시 터진다.
      expect(r.rows[0].roles, '역할 한정이 사라졌다').toContain('authenticated');
    } finally { await c.end(); }
  });
});

describe.skipIf(!ENABLED)('자동 전이 폐지와 쓰기 봉쇄 (실DB)', () => {
  // **자동 전이가 폐지됐다**(마이그레이션 `20260830090000` · 최박사 확정 2026-08-30).
  //   포럼회원은 **오직 운영자가 지정해야** 되는 것이므로, 마감이 등록자 전원을 승급시키던
  //   트리거를 지웠다. 아래 두 테스트는 그 폐지를 **확인하는 쪽으로 뒤집었다** —
  //   지우는 대신 뒤집은 이유: *마감이 무엇을 하지 않는가* 를 아무도 재지 않으면
  //   다음 사람이 트리거를 되살려도 조용하다.
  // ── **대조 쌍 강제** (지휘부 권고 2026-08-30) ────────────────────────────────
  //
  //   같은 회차에 오측을 **세 번** 했고 셋 다 뿌리가 같았다 — **값 하나만 보고 판단했다.**
  //     ⑴ 운영자를 골랐다 → 본 것은 *첫 OR 통과*, 놓친 것은 *차단 검사가 아니라는 사실*
  //     ⑵ 남의 기수를 쟀다 → 본 것은 `피드읽기=false`, 놓친 것은 *차단인지 애초에 남의 방인지*
  //     ⑶ 주석을 셌다   → 본 것은 *문자열 개수*, 놓친 것은 *실코드인지*
  //
  //   **⑵ 가 답을 준다**: `false` 하나로는 *막혔다* 와 *원래 없다* 를 못 가른다.
  //   같은 사람의 **자기 기수**에서 `true` 가 나와야 차단이 증명된다.
  //   **대조군 없는 측정은 무엇을 쟀는지 말하지 못한다** — 한쪽만 재고 기대값과 같으면 우연일 수 있다.
  //
  //   그래서 넷을 함께 잰다: 자기 기수 × 남의 기수 · expired 전 × 후.
  //   이 넷이면 세 번의 오측이 **전부** 잡혔을 것이다.
  it('**expired 차단을 대조 쌍으로 증명한다** — 자기/남의 기수 × 전/후 넷', async () => {
    const client = await open();
    try {
      // 대조군이 성립하려면 **운영자가 아니어야** 한다 — is_admin 이 첫 OR 라 통과해 버린다.
      const role = await scalarAs(client, MEMBER, `select role as s from public.users where id='${MEMBER}'`);
      expect(role, '대조가 성립하려면 운영자가 아니어야 한다').not.toBe('admin');

      const mine = COHORT;                       // 자기 기수
      const other = OTHER_COHORT;                // 남의 기수 — 대조군
      const feed = (coh: string) =>
        scalarAs(client, MEMBER, `select public.feed_can_access('${coh}','${MEMBER}')::text as s`);

      // ① 차단 전 — **자기 기수는 true, 남의 기수는 false**.
      //    이 한 쌍이 *측정이 실제로 무언가를 재고 있다* 는 증거다.
      expect(await feed(mine), '차단 전 · 자기 기수는 열려 있어야 측정이 성립한다').toBe('true');
      expect(await feed(other), '차단 전 · 남의 기수는 원래 닫혀 있다(대조군)').toBe('false');

      // ② 차단 후 — 자기 기수가 **true → false** 로 바뀌어야 차단이 증명된다.
      await client.query(seed(MEMBER, 'expired', null));
      expect(await feed(mine), '차단 후 · 자기 기수가 닫힌다 — **이 변화가 곧 차단이다**').toBe('false');
      expect(await feed(other), '차단 후 · 남의 기수는 여전히 닫혀 있다(변화 없음)').toBe('false');

      // ③ 되돌리면 자기 기수만 다시 열린다 — 우연이 아님을 한 번 더 못 박는다.
      await client.query(`delete from public.memberships where user_id='${MEMBER}'`);
      expect(await feed(mine), '되돌리면 자기 기수만 다시 열린다').toBe('true');
      expect(await feed(other), '남의 기수는 끝까지 닫혀 있다').toBe('false');
    } finally { await close(client); }
  });

  // ── `이용 보류` 안내 문안 (최박사 확정 2026-08-30 · `20260831100000`) ──────────────
  //
  //   **정의 문자열을 읽어 확인하지 않는다.** 함수 본문에 그 문장이 있다는 것과
  //   **실제로 그 문장이 던져진다**는 것은 다른 사실이다 — 앞은 문자열의 존재이고
  //   뒤는 동작이다. 게이트 잠금에서 *있는가/작동하는가* 를 가른 것과 같은 형식이라,
  //   여기서는 **띄워서 받는다.**
  it('**`expired` 는 최박사 문구를 던진다** — `held` 와 뭉개지지 않는다', async () => {
    const client = await open();
    try {
      const raised = async (uid: string): Promise<{ code: string; message: string }> => {
        await client.query('savepoint hm');
        try {
          await client.query(`set local role authenticated`);
          await client.query(`select set_config('request.jwt.claims','{"sub":"${uid}","role":"authenticated"}',true)`);
          await client.query(`select public.feed_assert_writable('${uid}')`);
          return { code: '(안 던졌다)', message: '' };
        } catch (e) {
          const err = e as { code: string; message: string };
          return { code: err.code, message: err.message };
        } finally {
          await client.query('rollback to savepoint hm');
          await client.query('reset role');
        }
      };

      // ① **대조군** — 아무 상태도 아니면 던지지 않는다. 이것이 없으면 아래 문장이
      //    *보류라서* 나온 것인지 *원래 다 막혀서* 나온 것인지 못 가른다.
      await client.query(`delete from public.memberships where user_id='${MEMBER}'`);
      expect((await raised(MEMBER)).code, '대조군 · 막힐 이유가 없으면 던지지 않는다').toBe('(안 던졌다)');

      // ② `expired` — **최박사 문구 그대로.**
      await client.query(seed(MEMBER, 'expired', null));
      const ex = await raised(MEMBER);
      expect(ex.code).toBe('55000');
      expect(ex.message, '최박사 확정 문안이 그대로 나와야 한다')
        .toBe('이용이 보류되었습니다. 운영자에게 문의해 주십시오.');

      // ③ `held` — **함께 바뀌지 않았다.** 두 상태는 뜻이 달라 한 문장으로 뭉개면 안 된다
      //    (`held` 는 *확인 중*, `expired` 는 *보류됨*).
      await client.query(seed(MEMBER, 'held', null));
      const hd = await raised(MEMBER);
      expect(hd.code).toBe('55000');
      expect(hd.message, 'held 문장이 함께 바뀌면 안 된다')
        .toBe('계정 확인이 필요해 지금은 글을 올릴 수 없어요. 아래 문의로 알려 주시면 확인해 드릴게요.');
      expect(hd.message, '두 문장이 같아지면 상태 구분이 사라진다').not.toBe(ex.message);
    } finally { await close(client); }
  });

  it('**마감이 자격을 만들지 않는다** — 트리거 폐지 확인', async () => {
    const client = await open();
    try {
      await client.query(ENROLL_STAFF);
      await client.query(seed(COACH_A, 'individual', '2030-01-01'));
      await client.query(seed(ADMIN, 'held', null));
      const before = (await client.query(`select count(*)::int as c from public.memberships`)).rows[0].c;

      await client.query(`update public.cohorts set status='archived' where id='${COHORT}'`);

      const after = (await client.query(`select count(*)::int as c from public.memberships`)).rows[0].c;
      expect(after, '마감이 memberships 행을 만들지 않는다').toBe(before);

      const row = async (u: string) =>
        (await client.query(
          `select status, valid_until::text as valid_until from public.memberships where user_id='${u}'`,
        )).rows[0];
      expect((await row(COACH_A)).valid_until, '기존 individual 은 그대로다').toBe('2030-01-01');
      expect((await row(ADMIN)).status, 'held 도 그대로다').toBe('held');
      // 행이 없던 사람은 여전히 없다 — 지정 없이 자격이 생기지 않는다.
      expect(
        (await client.query(`select count(*)::int as c from public.memberships where user_id='${MEMBER}'`)).rows[0].c,
        '지정 없이 포럼회원이 되지 않는다',
      ).toBe(0);

      // 트리거 자체가 사라졌는지도 본다 — 이름으로 직접 조회한다.
      expect(
        (await client.query(
          `select count(*)::int as c from pg_trigger where tgrelid='public.cohorts'::regclass
            and tgname='cohorts_archive_membership' and not tgisinternal`)).rows[0].c,
        '트리거가 사라졌다',
      ).toBe(0);
    } finally { await close(client); }
  });

  it('**마감된 세미나 참여자는 pending 으로 내려앉되 기록은 지킨다** — 최박사 모델', async () => {
    // 옛 기댓값은 `individual`(트리거가 만든 것)이었다. 이제 **지정 없이는 승급되지 않으므로**
    //   저장 행이 없으면 `pending` 이다. **그것이 잠김을 뜻하지 않는다** —
    //   본인 회기 기록물(진단 응답·갈무리·피드)은 자격을 보지 않는다.
    const client = await open();
    try {
      expect(await stateOf(client, MEMBER)).toBe('cohort');
      await client.query(`update public.cohorts set status='archived' where id='${COHORT}'`);
      expect(await stateOf(client, MEMBER), '지정 없이 승급되지 않는다').toBe('pending');

      // **기록은 지킨다** — 피드 열람이 마감 뒤에도 열린다(ADR-124 확정 ③).
      expect(
        await scalarAs(client, MEMBER, `select public.feed_can_access('${COHORT}','${MEMBER}')::text as s`),
        '마감 뒤에도 자기 회기 피드가 열린다',
      ).toBe('true');

      // 바깥 도구는 열람만 — 신규는 막힌다.
      expect(
        await scalarAs(client, MEMBER, `select public.member_tool_access('${MEMBER}') as s`),
        '종료된 회기 참여자는 read_only',
      ).toBe('read_only');
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
