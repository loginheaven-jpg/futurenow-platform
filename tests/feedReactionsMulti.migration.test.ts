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
import { countAs, expectRaise, runAs, scalarAs } from './helpers/asRole';
import { FEED_EMOJI } from '@/contracts/domain';

const ENABLED = process.env.RUN_RLS_INTEGRATION === '1' && !!process.env.SUPABASE_DB_URL;
const MIGRATION = 'supabase/migrations/20260829090000_feed_reactions_multi.sql';

const COACH_A = '11111111-0000-0000-0000-0000000000a1';
const MEM_A1 = '22222222-0000-0000-0000-0000000000a1';
const MEM_A2 = '22222222-0000-0000-0000-0000000000a2';
const HELD = '22222222-0000-0000-0000-000000009999';
const COH_A = 'aaaaaaaa-0000-0000-0000-00000000000a';

// 픽스처는 통합테스트와 **같은 축**이다(seminar×active). 여기서는 반응만 보므로 최소로 줄인다.
const SETUP = `
set local session_replication_role = replica;
insert into auth.users (id,email) values
 ('${COACH_A}','fa@t.test'),('${MEM_A1}','m1@t.test'),('${MEM_A2}','m2@t.test'),('${HELD}','hh@t.test');
insert into public.users (id,email,name,nickname,role) values
 ('${COACH_A}','fa@t.test','코치A','fa','coach'),
 ('${MEM_A1}','m1@t.test','참여1','m1','user'),
 ('${MEM_A2}','m2@t.test','참여2','m2','user'),
 ('${HELD}','hh@t.test','보류','hh','user');
update public.users set membership_state='held' where id='${HELD}';
insert into public.cohorts (id,coach_id,instrument_id,name,code,status,max_members)
 values ('${COH_A}','${COACH_A}','futurenow','A기','AAAAA','active',10);
insert into public.enrollments (cohort_id,user_id) values
 ('${COH_A}','${MEM_A1}'),('${COH_A}','${MEM_A2}'),('${COH_A}','${HELD}');
`;

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

describe.skipIf(!ENABLED)('마이그레이션 롤백 검증 — 되돌리는 문이 먼저다', () => {
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

  it('적용 뒤 토글이 산다 — 넷을 눌러 넷이 남고, 박수와 기도가 함께 산다', async () => {
    const client = await open();
    try {
      await client.query(readFileSync(MIGRATION, 'utf8'));
      await client.query(SETUP);
      await runAs(client, MEM_A1, `select public.feed_post_create('${COH_A}','반응 대상')`);
      const pid = (await client.query(
        `select id from public.feed_posts where cohort_id='${COH_A}' order by created_at desc limit 1`)).rows[0].id;

      for (const e of FEED_EMOJI) await runAs(client, MEM_A2, `select public.feed_react('${pid}','${e}')`);
      expect(await countAs(client, MEM_A2,
        `select count(*) from public.feed_reactions where post_id='${pid}' and user_id='${MEM_A2}'`))
        .toBe(FEED_EMOJI.length);
      expect(await countAs(client, MEM_A2,
        `select count(*) from public.feed_reactions
          where post_id='${pid}' and user_id='${MEM_A2}' and emoji in ('👏','🙏')`)).toBe(2);

      // 같은 것 재호출 = 그것만 취소
      await runAs(client, MEM_A2, `select public.feed_react('${pid}','👏')`);
      expect(await countAs(client, MEM_A2,
        `select count(*) from public.feed_reactions where post_id='${pid}' and user_id='${MEM_A2}'`))
        .toBe(FEED_EMOJI.length - 1);

      // 반환·목록이 같은 순서의 배열이다(선언 순서)
      expect(await scalarAs(client, MEM_A2, `select array_to_string(public.feed_react('${pid}','👏'), ',') as e`))
        .toBe(FEED_EMOJI.join(','));
      expect(await scalarAs(client, MEM_A2,
        `select array_to_string(my_reactions, ',') as e from public.feed_post_list('${COH_A}') where id='${pid}'`))
        .toBe(FEED_EMOJI.join(','));

      // 게이트가 그대로다 — 순서(쓰기 자격 → 열람 → 이모지 → 묘비)를 옛 함수와 똑같이 옮겼다
      await expectRaise(client, HELD, `select public.feed_react('${pid}','👏')`, '55000');
      await expectRaise(client, MEM_A2, `select public.feed_react('${pid}','🔥')`, '22023');

      // 남의 반응 불가침
      await runAs(client, MEM_A1, `select public.feed_react('${pid}','👏')`);
      expect(await countAs(client, MEM_A1,
        `select count(*) from public.feed_reactions where post_id='${pid}' and emoji='👏'`)).toBe(2);
    } finally {
      await close(client);
    }
  });

  it('권한이 원 파일과 같은 모양으로 돌아온다 — DROP 하면 옛 GRANT 도 사라진다', async () => {
    const client = await open();
    try {
      await client.query(readFileSync(MIGRATION, 'utf8'));
      for (const fn of ['feed_react', 'feed_post_list']) {
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
