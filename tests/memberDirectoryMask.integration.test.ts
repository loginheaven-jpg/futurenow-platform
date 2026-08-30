// 이름 마스킹 잠금 — **규칙을 실제로 먹여 결과를 단언한다**(지휘부 지시 2026-08-30).
//
// ★ **「지금 0명」은 잠금이 아니다.** 실데이터에 이름 없는 사람이 없어도
//   **이름 없는 입력을 함수에 먹여** 마스킹 결과를 재야 실제로 무는 잠금이 된다.
//   0명이라는 사실은 보고서의 **맥락 기록**으로 남기고, 여기서는 **규칙을 문다.**
//
// 기본 SKIP — 실DB 옵트인:
//   RUN_RLS_INTEGRATION=1 SUPABASE_DB_URL="postgres://…" npm test
import { describe, it, expect } from 'vitest';
import { Client } from 'pg';

const ENABLED = process.env.RUN_RLS_INTEGRATION === '1' && !!process.env.SUPABASE_DB_URL;

async function connect() {
  const db = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await db.connect();
  return db;
}

/**
 * 트랜잭션 안에서 **가짜 차수 하나**를 세우고 그 인도자 JWT 로 함수를 부른다. 끝에 롤백한다.
 *   실기수·실계정은 건드리지 않는다 — 새 행만 만들고 되돌린다.
 */
async function withFixture<T>(fn: (db: Client, ctx: { cohortId: string; coachId: string; ids: string[] }) => Promise<T>): Promise<T> {
  const db = await connect();
  try {
    await db.query('begin');
    await db.query('set local session_replication_role = replica'); // auth.users FK 우회(롤백되므로 무영향)
    const coachId = '00000000-0000-4000-8000-0000000000c1';
    const cohortId = '00000000-0000-4000-8000-0000000000f1';
    await db.query(`insert into auth.users (id, email) values ($1,'mask-coach@t.test')`, [coachId]);
    await db.query(`insert into public.users (id,email,name,role) values ($1,'mask-coach@t.test','코치',
      'coach')`, [coachId]);
    await db.query(
      `insert into public.cohorts (id, coach_id, instrument_id, name, code, status, max_members)
       values ($1,$2,'futurenow','[마스킹검증]','MASKQ','active',20)`, [cohortId, coachId]);

    // 마스킹 규칙의 경계를 **먹인다**: 5자 이상 · 4자(경계) · 3자 · 이메일 없음 · 이름 있음.
    const people: [string, string | null, string | null][] = [
      ['00000000-0000-4000-8000-0000000000a1', null, 'hongkildong@x.test'], // 11자 → hong***
      ['00000000-0000-4000-8000-0000000000a2', null, 'honga@x.test'],       //  5자 → hong***
      ['00000000-0000-4000-8000-0000000000a3', null, 'hong@x.test'],        //  4자 → hong***  ★ 경계
      ['00000000-0000-4000-8000-0000000000a4', null, 'kim@x.test'],         //  3자 → kim***
      ['00000000-0000-4000-8000-0000000000a5', '   ', 'space@x.test'],      // 공백 이름도 없는 것으로 본다
      ['00000000-0000-4000-8000-0000000000a6', '이승은', 'lee@x.test'],      // 이름이 있으면 이름
    ];
    for (const [id, name, email] of people) {
      await db.query(`insert into auth.users (id, email) values ($1,$2)`, [id, email]);
      await db.query(`insert into public.users (id,email,name,role) values ($1,$2,$3,'user')`, [id, email, name]);
      await db.query(`insert into public.enrollments (cohort_id, user_id) values ($1,$2)`, [cohortId, id]);
    }
    // 인도자 JWT — 게이트가 auth.uid() 를 본다.
    await db.query(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: coachId, role: 'authenticated' })]);
    return await fn(db, { cohortId, coachId, ids: people.map((p) => p[0]) });
  } finally {
    await db.query('rollback').catch(() => {});
    await db.end().catch(() => {});
  }
}

describe.skipIf(!ENABLED)('★ 이름 마스킹 — 규칙을 실제로 먹인다', () => {
  it('★ 마스킹을 켜면 규칙대로 가려진다 (인수 2 · 4자 경계 포함)', async () => {
    await withFixture(async (db, { cohortId }) => {
      const { rows } = await db.query(
        `select u.email, d.name
           from public.cohort_member_directory($1, true, true) d
           join public.users u on u.id = d.user_id
          order by u.email`, [cohortId]);
      const by = new Map(rows.map((r) => [r.email as string, r.name as string | null]));
      // **물 것이 실재하는가** — 행이 0이면 이 잠금은 아무것도 증명하지 못한다(계열 ⑦).
      expect(rows.length, '픽스처가 안 섰다').toBe(6);

      expect(by.get('hongkildong@x.test'), '11자 → 앞 4자 + ***').toBe('hong***');
      expect(by.get('honga@x.test'), '5자 → 앞 4자 + ***').toBe('hong***');
      // ★ **4자는 「4자 이하」쪽이다** — 전체 + ***. 결과는 위와 같으나 경계를 여기 못 박는다.
      expect(by.get('hong@x.test'), '4자 경계 → 전체 + ***').toBe('hong***');
      expect(by.get('kim@x.test'), '3자 → 전체 + ***').toBe('kim***');
      expect(by.get('space@x.test'), '공백 이름도 없는 것으로 본다').toBe('spac***');
      expect(by.get('lee@x.test'), '이름이 있으면 이름 그대로').toBe('이승은');
    });
  });

  it('★ 도메인이 새지 않는다', async () => {
    await withFixture(async (db, { cohortId }) => {
      const { rows } = await db.query(
        `select d.name from public.cohort_member_directory($1, true, true) d`, [cohortId]);
      const all = rows.map((r) => r.name ?? '').join(' ');
      expect(all, '도메인이 표시됐다').not.toContain('x.test');
      expect(all, '골뱅이가 새어 나갔다').not.toContain(String.fromCharCode(64));
    });
  });

  it('★★ 기본값 호출이 **종전과 같다** — 이름 없는 사람은 NULL (인수 1)', async () => {
    await withFixture(async (db, { cohortId }) => {
      const { rows } = await db.query(
        `select u.email, d.name
           from public.cohort_member_directory($1, true) d
           join public.users u on u.id = d.user_id
          order by u.email`, [cohortId]);
      const by = new Map(rows.map((r) => [r.email as string, r.name as string | null]));
      // 다섯이 NULL 로 와야 한다 — 마스킹이 **꺼진** 상태다.
      expect(by.get('hongkildong@x.test'), '기본값인데 마스킹됐다').toBeNull();
      expect(by.get('hong@x.test')).toBeNull();
      // ★ 공백 이름은 마스킹을 **끄면 공백 그대로** 나온다 — 옛 함수가 `u.name` 을 그냥 냈기 때문이다.
      //   NULL 이 아니라 `'   '` 인 것이 **기본값 = 기존 동작**의 증거다. 여기서 NULL 이 나오면
      //   마스킹이 꺼진 경로에까지 손을 댄 것이므로 오히려 결함이다.
      expect(by.get('space@x.test'), '끈 경로가 옛 동작과 갈렸다').toBe('   ');
      expect(by.get('lee@x.test'), '이름은 켜든 끄든 그대로').toBe('이승은');
      // 행 수는 두 호출이 같다 — 인자가 결과 집합을 바꾸지 않는다.
      const { rows: onRows } = await db.query(
        `select 1 from public.cohort_member_directory($1, true, true)`, [cohortId]);
      expect(onRows.length).toBe(rows.length);
    });
  });

  it('★★ 권한 게이트를 우회하지 않는다 — 남의 차수는 빈 결과 (인수 8)', async () => {
    await withFixture(async (db, { cohortId }) => {
      // 인도자가 아닌 사람으로 바꿔 부른다.
      await db.query(`select set_config('request.jwt.claims', $1, true)`,
        [JSON.stringify({ sub: '00000000-0000-4000-8000-0000000000a1', role: 'authenticated' })]);
      const off = await db.query(`select 1 from public.cohort_member_directory($1, true)`, [cohortId]);
      const on = await db.query(`select 1 from public.cohort_member_directory($1, true, true)`, [cohortId]);
      expect(off.rows.length, '게이트가 열렸다').toBe(0);
      // ★ **마스킹을 켜도 게이트가 먼저다.** 새 인자가 우회로가 되면 안 된다.
      expect(on.rows.length, '새 인자가 게이트를 우회한다').toBe(0);
    });
  });

  it('오버로드가 없다 · 권한이 옛것과 같다', async () => {
    const db = await connect();
    try {
      const { rows } = await db.query(`
        select (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                 where n.nspname='public' and p.proname='cohort_member_directory')::int cnt,
               (select string_agg(grantee,',' order by grantee) from information_schema.routine_privileges
                 where routine_schema='public' and routine_name='cohort_member_directory'
                   and grantee in ('anon','authenticated','service_role')) acl`);
      expect(rows[0].cnt, '오버로드가 남았다 — 2인자 호출이 어디로 갈지 갈린다').toBe(1);
      // 옛 ACL 과 같아야 한다. anon 이 붙으면 default privileges 를 한 겹만 걷은 것이다.
      expect(rows[0].acl).toBe('authenticated,service_role');
    } finally {
      await db.end();
    }
  });
});
