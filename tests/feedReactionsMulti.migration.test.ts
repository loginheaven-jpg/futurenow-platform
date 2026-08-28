// 마이그레이션 **롤백 검증** — `20260829090000_feed_reactions_multi.sql` (5차 소건 2).
//
// 지휘부가 못 박은 순서: **적용 → 롤백 검증 → 통합테스트 14 → 보고 → 확인 → 병합 → 배포.**
// 정확히는 *"2차 때 롤백 검증 103 대 103 을 했던 방식 그대로 **적용 전에 되돌리는 문을 먼저**
// 확인하라"* 이므로, 이 파일은 **적용 전에** 돌린다.
//
// 2차와 같은 규약이다 — 전 과정 `BEGIN … ROLLBACK`, **실데이터 한 행도 변하지 않는다.**
// 다른 점은 하나뿐이다: 2차는 새 표를 만들었고 **이번은 이미 실데이터가 든 표의 제약을 바꾼다.**
// 그래서 단언 하나가 더 있다 — **적용 전후 `feed_reactions` 행 수 동일**(지휘부 요구).
// *PK 를 넓히는 변경이라 기존 행이 전부 유효하다* 는 것은 **주장이고**, 여기서 실측이 된다.
//
// 돌리는 법:
//   RUN_RLS_INTEGRATION=1 SUPABASE_DB_URL="postgres://...:5432/postgres" npx vitest run tests/feedReactionsMulti.migration.test.ts
//
// **DDL 도 트랜잭션 안이다**(Postgres). `ALTER TABLE`·`DROP FUNCTION`·`CREATE FUNCTION` 이 전부
// 되돌아가므로 *되돌리는 문*이 실제로 열리는지를 이 파일이 증명한다 — 마지막 단언이 그것이다.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

const ENABLED = process.env.RUN_RLS_INTEGRATION === '1' && !!process.env.SUPABASE_DB_URL;
const VERSION = '20260829090000';
const MIGRATION = `supabase/migrations/${VERSION}_feed_reactions_multi.sql`;

/**
 * **이 파일은 적용 *전* 에만 뜻이 있다.** 단언이 *적용 전 PK 는 두 열이다* 이므로
 * 적용 뒤에는 통과할 수 없다 — 그것이 결함이 아니라 **이 하네스의 성격**이다.
 *
 * 그렇다고 영구 실패로 두면 다음 사람이 *원래 빨간 것* 으로 배우고, 그 순간 잠금이 죽는다.
 * 그래서 **원장을 보고 스스로 건너뛴다.** 조용히 넘어가지 않게 이유를 찍는다 —
 * 건너뛴 것과 통과한 것은 다른 사실이다(§11 집계 규율의 결).
 */
const APPLIED = ENABLED ? await (async () => {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await c.connect();
  const n = Number((await c.query(
    'select count(*)::int as n from supabase_migrations.schema_migrations where version=$1', [VERSION])).rows[0].n);
  await c.end();
  if (n > 0) {
    console.log(`[migration ${VERSION}] 이미 적용됨 — 롤백 검증(적용 전 전용) 건너뜀. `
      + '적용 시점의 결과는 5차 마이그레이션 적용 보고에 있다.');
  }
  return n > 0;
})() : false;


// **여기에 픽스처를 두지 않는다.** 처음엔 두었다가 걷어냈다 —
// ⑴ 지어낸 픽스처가 실제와 달랐다(`users.membership_state` 라고 썼는데 실제는 `public.memberships` 표다).
//     **베끼지 않고 지어낸 것**이 원인이고, 그것이 바로 통과했다면 무엇을 잰 것인지 알 수 없었다.
// ⑵ 고쳐서 두더라도 `feed.integration.test.ts` 의 픽스처와 **사본이 둘**이 된다(불변식 23).
//
// 그래서 이 파일은 **스키마 층만** 잰다 — 이름·행 수·PK·권한·되돌리는 문.
// **동작(토글·복수 공존·게이트)은 통합테스트가 잰다**(순서상 이 파일 다음에 돈다).
// 층을 나눈 것이지 덜 재는 것이 아니다.

async function open(): Promise<Client> {
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await client.connect();
  await client.query('begin');
  return client;
}
async function close(client: Client): Promise<void> {
  await client.query('rollback');
  await client.end();
}

/** 현재 PK 열 구성. 되돌아갔는지를 이것으로 판정한다. */
const PK_COLS = `
select string_agg(a.attname, ',' order by k.ord) as e
  from pg_constraint c
  join lateral unnest(c.conkey) with ordinality as k(attnum, ord) on true
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
 where c.conrelid = 'public.feed_reactions'::regclass and c.contype = 'p'`;

describe.skipIf(!ENABLED || APPLIED)('마이그레이션 롤백 검증 — 되돌리는 문이 먼저다(적용 전 전용)', () => {
  it('**마이그레이션이 실재하는 함수를 가리킨다** — 이름을 추측하지 않는다', async () => {
    // 적용 전에 잡힌 실수의 회귀 잠금. 처음 판은 `feed_post_list` 를 고쳤는데 **그런 함수가 없었다.**
    //   `DROP ... IF EXISTS` 가 조용히 지나가고 새 함수가 하나 더 생겼을 뿐,
    //   코드가 부르는 `feed_list` 는 옛 모양 그대로 남았을 것이다 — 적용하고도 안 고쳐진다.
    //   **테스트도 그 가짜 이름을 부르고 있었으므로 통과했을 것이다.** 도구가 재려던 것을 재지 않았다.
    const client = await open();
    try {
      const sql = readFileSync(MIGRATION, 'utf8');
      for (const fn of ['feed_list', 'feed_react']) {
        const exists = Number((await client.query(
          `select count(*)::int as n from pg_proc p join pg_namespace n on n.oid=p.pronamespace
            where n.nspname='public' and p.proname='${fn}'`)).rows[0].n);
        expect(exists, `public.${fn} 이 DB 에 없다 — 이름이 틀렸다`).toBeGreaterThan(0);
        expect(sql, `마이그레이션이 ${fn} 을 다루지 않는다`).toContain(`public.${fn}(`);
      }
      // 없는 이름을 만들어 내지 않았는지도 본다(반대 방향).
      expect(sql, '저장소에 없는 함수 이름이 남아 있다').not.toContain('feed_post_list(');
    } finally {
      await close(client);
    }
  });

  it('적용 전후 실데이터 행 수가 같다 — **넓히는 변경이라는 주장의 실측**', async () => {
    const client = await open();
    try {
      const before = Number((await client.query('select count(*) as n from public.feed_reactions')).rows[0].n);
      const pkBefore = (await client.query(PK_COLS)).rows[0].e;
      expect(pkBefore, '적용 전 PK 는 두 열이다').toBe('post_id,user_id');

      await client.query(readFileSync(MIGRATION, 'utf8'));

      const after = Number((await client.query('select count(*) as n from public.feed_reactions')).rows[0].n);
      const pkAfter = (await client.query(PK_COLS)).rows[0].e;
      expect(after, `행 수가 변했다: ${before} → ${after}`).toBe(before);
      expect(pkAfter, '적용 후 PK 는 세 열이다').toBe('post_id,user_id,emoji');
    } finally {
      await close(client);
    }
  });

  it('권한이 원 파일과 같은 모양으로 돌아온다 — DROP 하면 옛 GRANT 도 사라진다', async () => {
    const client = await open();
    try {
      await client.query(readFileSync(MIGRATION, 'utf8'));
      for (const fn of ['feed_react', 'feed_list']) {
        const anon = (await client.query(
          `select has_function_privilege('anon', p.oid, 'execute') as e
             from pg_proc p join pg_namespace n on n.oid=p.pronamespace
            where n.nspname='public' and p.proname='${fn}'`)).rows[0].e;
        const auth = (await client.query(
          `select has_function_privilege('authenticated', p.oid, 'execute') as e
             from pg_proc p join pg_namespace n on n.oid=p.pronamespace
            where n.nspname='public' and p.proname='${fn}'`)).rows[0].e;
        expect(anon, `${fn}: anon 은 실행할 수 없다`).toBe(false);
        expect(auth, `${fn}: authenticated 는 실행한다`).toBe(true);
      }
    } finally {
      await close(client);
    }
  });

  it('**되돌리는 문이 열린다** — ROLLBACK 뒤 PK 가 두 열로 돌아오고 행 수도 그대로다', async () => {
    const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
    await client.connect();
    try {
      const before = Number((await client.query('select count(*) as n from public.feed_reactions')).rows[0].n);

      await client.query('begin');
      await client.query(readFileSync(MIGRATION, 'utf8'));
      expect((await client.query(PK_COLS)).rows[0].e).toBe('post_id,user_id,emoji');
      await client.query('rollback');

      // 트랜잭션 밖에서 다시 읽는다 — 되돌아갔는지는 **밖에서** 봐야 안다.
      expect((await client.query(PK_COLS)).rows[0].e, 'PK 가 되돌아왔다').toBe('post_id,user_id');
      expect(Number((await client.query('select count(*) as n from public.feed_reactions')).rows[0].n))
        .toBe(before);
      // 옛 함수가 살아 있다 — 반환 타입이 단일(text)인지로 확인한다.
      expect((await client.query(
        `select pg_get_function_result(p.oid) as e from pg_proc p
           join pg_namespace n on n.oid=p.pronamespace
          where n.nspname='public' and p.proname='feed_react'`)).rows[0].e).toBe('text');
    } finally {
      await client.end();
    }
  });
});
