// 동행 피드 격리·자격 진실표 (실DB · 2차 · ADR-124)
//
// **이 파일이 2차의 무게중심이다.** "다른 기수 글은 보이지 않는다"·"보류는 쓰기만 막는다"·
//   "수료 기수도 산다"는 전부 설계의 약속이고, 실DB에서 역할별로 돌아야 증명된다.
//   마이그레이션 적용 전 롤백 검증(103/103)이 통과시킨 단언을 저장소에 남기는 자리다 —
//   검증 스크립트는 버려지지만 이 파일은 회귀를 잡는다.
//
// 기본 SKIP — 실DB 연결이 필요하므로 명시적 옵트인일 때만 돈다:
//   RUN_RLS_INTEGRATION=1 SUPABASE_DB_URL="postgres://...:5432/postgres" npm test
// 모든 검증은 단일 트랜잭션에서 하고 끝에 ROLLBACK 한다(영속 0). 기존 두 통합테스트와 같은 규약이다.
import { describe, it, expect } from 'vitest';
import { Client } from 'pg';
import { countAs, expectRaise, runAs, scalarAs } from './helpers/asRole';
import { FEED_EMOJI } from '@/contracts/domain';

const ENABLED = process.env.RUN_RLS_INTEGRATION === '1' && !!process.env.SUPABASE_DB_URL;

const COACH_A = '11111111-0000-0000-0000-0000000000a1';
const COACH_B = '11111111-0000-0000-0000-0000000000b1';
const MEM_A1 = '22222222-0000-0000-0000-0000000000a1';
const MEM_A2 = '22222222-0000-0000-0000-0000000000a2';
const MEM_B1 = '22222222-0000-0000-0000-0000000000b1';
const HELD = '22222222-0000-0000-0000-000000009999';
const ADMIN = '44444444-0000-0000-0000-000000000001';

const COH_A = 'aaaaaaaa-0000-0000-0000-00000000000a'; // seminar · active
const COH_B = 'aaaaaaaa-0000-0000-0000-00000000000b'; // seminar · active (다른 기수)
const COH_ARCH = 'aaaaaaaa-0000-0000-0000-00000000000c'; // seminar · **archived** — 수료 기수도 산다
const COH_TRASH = 'aaaaaaaa-0000-0000-0000-00000000000d'; // **trash** — 피드가 없다

const NEWS_PUB = 'cccccccc-0000-0000-0000-000000000001';
const NEWS_DRAFT = 'cccccccc-0000-0000-0000-000000000002';

// 네 차수의 kind·status 조합이 판정의 축이다. seminar×active / seminar×archived / trash×active.
const SETUP = `
set local session_replication_role = replica;
insert into auth.users (id,email) values
 ('${COACH_A}','fa@t.test'),('${COACH_B}','fb@t.test'),('${MEM_A1}','m1@t.test'),
 ('${MEM_A2}','m2@t.test'),('${MEM_B1}','m3@t.test'),('${HELD}','hh@t.test'),('${ADMIN}','ad@t.test');
insert into public.users (id,email,name,nickname,role) values
 ('${COACH_A}','fa@t.test','코치A','fa','coach'),
 ('${COACH_B}','fb@t.test','코치B','fb','coach'),
 ('${MEM_A1}','m1@t.test','참여자A1','m1','user'),
 ('${MEM_A2}','m2@t.test','참여자A2','m2','user'),
 ('${MEM_B1}','m3@t.test','참여자B1','m3','user'),
 ('${HELD}','hh@t.test','보류자','hh','user'),
 ('${ADMIN}','ad@t.test','운영자','ad','admin');
insert into public.cohorts (id,coach_id,instrument_id,name,code,status,kind,max_members) values
 ('${COH_A}','${COACH_A}','__ftest__','피드A','FDAAA','active','seminar',30),
 ('${COH_B}','${COACH_B}','__ftest__','피드B','FDBBB','active','seminar',30),
 ('${COH_ARCH}','${COACH_A}','__ftest__','수료기수','FDCCC','archived','seminar',30),
 ('${COH_TRASH}','${COACH_A}','__ftest__','휴지통T','FDDDD','active','trash',30);
insert into public.enrollments (cohort_id,user_id) values
 ('${COH_A}','${MEM_A1}'),('${COH_A}','${MEM_A2}'),('${COH_A}','${HELD}'),
 ('${COH_B}','${MEM_B1}'),('${COH_ARCH}','${MEM_A1}'),('${COH_TRASH}','${MEM_A1}');
insert into public.memberships (user_id,status,decided_at,decision_note)
 values ('${HELD}','held',now(),'통합테스트 픽스처');
insert into public.news_posts (id,title,body,published_at,author_id) values
 ('${NEWS_PUB}','발행소식','본문',now(),'${ADMIN}'),
 ('${NEWS_DRAFT}','초안소식','본문',null,'${ADMIN}');
set local session_replication_role = origin;
`;

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

const access = (c: Client, u: string, cohort: string) =>
  scalarAs(c, u, `select public.feed_can_access('${cohort}') as a`);
const post = (c: Client, u: string, cohort: string, body: string) =>
  runAs(c, u, `select public.feed_post_create('${cohort}', '${body}')`);
/** 소유자 권한으로 방금 만든 글의 id 한 개. */
async function idOf(c: Client, cohort: string, body: string): Promise<string> {
  const r = await c.query(`select id from public.feed_posts where cohort_id='${cohort}' and body='${body}'`);
  return r.rows[0].id as string;
}

describe.skipIf(!ENABLED)('동행 피드 — 기수 격리와 자격 (실DB · 역할별)', () => {
  it('kind 를 보고 status 는 보지 않는다 — 휴지통은 막고 수료 기수는 산다', async () => {
    const client = await open();
    try {
      expect(await access(client, MEM_A1, COH_A), '자기 기수').toBe('true');
      expect(await access(client, MEM_B1, COH_A), '다른 기수 참여자').toBe('false');
      expect(await access(client, COACH_A, COH_A), '담당 인도자').toBe('true');
      expect(await access(client, COACH_B, COH_A), '남의 기수 인도자').toBe('false');
      expect(await access(client, ADMIN, COH_A), '운영자').toBe('true');
      // 이 둘이 이 함수의 전부다.
      expect(await access(client, MEM_A1, COH_ARCH), '수료(archived) 기수도 피드가 산다').toBe('true');
      expect(await access(client, MEM_A1, COH_TRASH), '휴지통 차수는 피드가 없다').toBe('false');
      expect(await access(client, COACH_A, COH_TRASH), '휴지통은 인도자에게도 없다').toBe('false');
    } finally { await close(client); }
  });

  it('기수 격리 — 다른 기수 글은 목록에도 직접 조회에도 0건', async () => {
    const client = await open();
    try {
      await post(client, MEM_A1, COH_A, '팔굽혀펴기 20회');
      await post(client, MEM_B1, COH_B, '다른 기수 글');
      // 직접 조회(RLS)
      expect(await countAs(client, MEM_B1, `select count(*) from public.feed_posts where cohort_id='${COH_A}'`)).toBe(0);
      expect(await countAs(client, MEM_A1, `select count(*) from public.feed_posts where cohort_id='${COH_B}'`)).toBe(0);
      // 목록 RPC — 자격이 없으면 조용히 빈 목록이 아니라 **거부**한다
      await expectRaise(client, MEM_B1, `select * from public.feed_list('${COH_A}')`, '42501');
      expect(await countAs(client, MEM_A1, `select count(*) from public.feed_list('${COH_A}')`)).toBe(1);
    } finally { await close(client); }
  });

  it('수료 기수에 참여자도 인도자도 계속 쓴다 — 6주로 끝나지 않는다', async () => {
    const client = await open();
    try {
      await post(client, MEM_A1, COH_ARCH, '수료 후에도');
      await post(client, COACH_A, COH_ARCH, '인도자 아침 글');
      expect(await countAs(client, MEM_A1, `select count(*) from public.feed_list('${COH_ARCH}')`)).toBe(2);
    } finally { await close(client); }
  });

  it('보류(held)는 쓰기만 막고 읽기는 그대로 둔다', async () => {
    const client = await open();
    try {
      await post(client, MEM_A1, COH_A, '살아 있는 글');
      const pid = await idOf(client, COH_A, '살아 있는 글');
      // 읽기 — 막지 않는다
      expect(await access(client, HELD, COH_A), '보류자도 읽는다').toBe('true');
      expect(await countAs(client, HELD, `select count(*) from public.feed_list('${COH_A}')`)).toBe(1);
      // 쓰기 셋 — 전부 막는다. 55000 은 사용자에게 보일 사실 문장을 실어 나른다(조용히 막지 않는다).
      await expectRaise(client, HELD, `select public.feed_post_create('${COH_A}','보류자 글')`, '55000');
      await expectRaise(client, HELD, `select public.feed_comment_create('${pid}','보류자 댓글')`, '55000');
      await expectRaise(client, HELD, `select public.feed_react('${pid}','👏')`, '55000');
      await expectRaise(client, HELD, `select public.news_comment_create('${NEWS_PUB}','보류자')`, '55000');
    } finally { await close(client); }
  });

  it('사진만 올려도 게시되고, 그 글도 지워진다', async () => {
    // 롤백 검증이 잡은 결함의 회귀 잠금 — 사진만 올린 글은 body 가 '' 이라
    //   삭제가 photo_path 를 비우는 순간 CHECK 에 걸려 **아예 지워지지 않았다**(23514).
    const client = await open();
    try {
      await runAs(client, MEM_A1,
        `select public.feed_post_create('${COH_A}', '', '${COH_A}/${MEM_A1}/x.jpg')`);
      const pid = (await client.query(
        `select id from public.feed_posts where cohort_id='${COH_A}' and photo_path is not null`)).rows[0].id;
      await runAs(client, MEM_A1, `select public.feed_post_delete('${pid}')`);
      const row = (await client.query(`select photo_path, deleted_at from public.feed_posts where id='${pid}'`)).rows[0];
      expect(row.deleted_at, '삭제됐다').not.toBeNull();
      expect(row.photo_path, '죽은 참조를 남기지 않는다').toBeNull();
    } finally { await close(client); }
  });

  it('사진 경로 위조를 막는다 — 남의 폴더도 다른 기수 폴더도', async () => {
    const client = await open();
    try {
      await expectRaise(client, MEM_A1,
        `select public.feed_post_create('${COH_A}','x','${COH_A}/${MEM_A2}/x.jpg')`, '42501');
      await expectRaise(client, MEM_A1,
        `select public.feed_post_create('${COH_A}','x','${COH_B}/${MEM_A1}/x.jpg')`, '42501');
    } finally { await close(client); }
  });

  it('삭제는 soft — 댓글 있는 글만 본문 없는 묘비로 남는다', async () => {
    const client = await open();
    try {
      await post(client, MEM_A1, COH_A, '댓글 없는 글');
      await post(client, MEM_A1, COH_A, '댓글 있는 글');
      const bare = await idOf(client, COH_A, '댓글 없는 글');
      const kept = await idOf(client, COH_A, '댓글 있는 글');
      await runAs(client, MEM_A2, `select public.feed_comment_create('${kept}','와우')`);
      await runAs(client, MEM_A1, `select public.feed_post_delete('${bare}')`);
      await runAs(client, MEM_A1, `select public.feed_post_delete('${kept}')`);

      const rows = (await (async () => {
        await client.query(`set local role authenticated`);
        await client.query(`select set_config('request.jwt.claims', $1, true)`,
          [JSON.stringify({ sub: MEM_A1, role: 'authenticated' })]);
        const r = await client.query(`select id, body, author_name, deleted from public.feed_list('${COH_A}')`);
        await client.query(`reset role`);
        return r;
      })()).rows as { id: string; body: string | null; author_name: string | null; deleted: boolean }[];

      expect(rows.find((r) => r.id === bare), '댓글 없는 삭제글은 사라진다').toBeUndefined();
      const tomb = rows.find((r) => r.id === kept);
      expect(tomb?.deleted, '댓글 있는 삭제글은 묘비로 남는다').toBe(true);
      expect(tomb?.body, '묘비는 본문을 비운다').toBeNull();
      expect(tomb?.author_name, '묘비는 작성자를 비운다').toBeNull();
      // 직접 조회로는 삭제분이 보이지 않는다 — 지운 본문이 테이블 조회로 새면 삭제가 뜻을 잃는다
      expect(await countAs(client, MEM_A1, `select count(*) from public.feed_posts where id='${kept}'`)).toBe(0);
      await expectRaise(client, MEM_A2, `select public.feed_comment_create('${kept}','늦은 댓글')`, '55000');
    } finally { await close(client); }
  });

  it('인도자는 자기 기수 글을 지우고, 다른 참여자는 못 지운다', async () => {
    const client = await open();
    try {
      await post(client, MEM_A1, COH_A, '부적절한 글');
      const pid = await idOf(client, COH_A, '부적절한 글');
      await expectRaise(client, MEM_A2, `select public.feed_post_delete('${pid}')`, '42501');
      await runAs(client, COACH_A, `select public.feed_post_delete('${pid}')`);
      await runAs(client, COACH_A, `select public.feed_post_delete('${pid}')`); // 멱등
    } finally { await close(client); }
  });

  it('이모지는 DB 목록과 계약 상수가 같은 넷이고, 한 사람 한 반응이다', async () => {
    // **사본이 둘인 자리다** — DB `feed_emojis()` 와 TS `FEED_EMOJI`. 여기서 묶지 않으면 갈린다.
    const client = await open();
    try {
      const dbList = (await client.query(`select unnest(public.feed_emojis()) as e`)).rows.map((r) => r.e as string);
      expect(dbList, 'DB 목록 = 계약 상수').toEqual([...FEED_EMOJI]);

      await post(client, MEM_A1, COH_A, '반응 대상');
      const pid = await idOf(client, COH_A, '반응 대상');
      for (const e of FEED_EMOJI) await runAs(client, MEM_A2, `select public.feed_react('${pid}','${e}')`);
      // 넷을 차례로 눌렀으니 마지막 하나만 남는다 — 누적이 아니라 교체다
      expect(await countAs(client, MEM_A2,
        `select count(*) from public.feed_reactions where post_id='${pid}' and user_id='${MEM_A2}'`)).toBe(1);
      expect(await scalarAs(client, MEM_A2,
        `select emoji as e from public.feed_reactions where post_id='${pid}' and user_id='${MEM_A2}'`))
        .toBe(FEED_EMOJI[FEED_EMOJI.length - 1]);
      // 같은 이모지 재호출 = 취소
      await runAs(client, MEM_A2, `select public.feed_react('${pid}','${FEED_EMOJI[FEED_EMOJI.length - 1]}')`);
      expect(await countAs(client, MEM_A2,
        `select count(*) from public.feed_reactions where post_id='${pid}' and user_id='${MEM_A2}'`)).toBe(0);
      // 목록 밖 이모지는 거부
      await expectRaise(client, MEM_A2, `select public.feed_react('${pid}','🔥')`, '22023');
    } finally { await close(client); }
  });

  it('인도자 콘솔 정보가 참여자에게 새지 않는다', async () => {
    // 발주 §6.2 — "참여자에게 이 정보가 새지 않는지 회귀 테스트로 잠근다".
    //   화면에서 감추는 것은 표시일 뿐이고 막는 것은 RPC 다(IA §5.8).
    const client = await open();
    try {
      await post(client, MEM_A1, COH_A, '오늘 걸음');
      await expectRaise(client, MEM_A1, `select * from public.feed_flow('${COH_A}')`, '42501');
      await expectRaise(client, MEM_A1, `select * from public.feed_quiet('${COH_A}')`, '42501');
      await expectRaise(client, COACH_B, `select * from public.feed_flow('${COH_A}')`, '42501');
      await expectRaise(client, HELD, `select * from public.feed_quiet('${COH_A}')`, '42501');
      await runAs(client, COACH_A, `select * from public.feed_flow('${COH_A}')`);

      // 조용한 분: 게시한 사람은 빠지고, 인도자 자신은 세지 않는다
      await client.query(`set local role authenticated`);
      await client.query(`select set_config('request.jwt.claims', $1, true)`,
        [JSON.stringify({ sub: COACH_A, role: 'authenticated' })]);
      const q = (await client.query(`select user_id from public.feed_quiet('${COH_A}', 3)`)).rows.map((r) => r.user_id);
      await client.query(`reset role`);
      expect(q, '게시한 사람은 조용한 분이 아니다').not.toContain(MEM_A1);
      expect(q, '미게시자는 든다').toContain(MEM_A2);
      expect(q, '인도자 자신은 세지 않는다').not.toContain(COACH_A);
    } finally { await close(client); }
  });

  it('내 기수 목록에 휴지통은 없고 수료 기수는 있다 — 활성이 먼저', async () => {
    const client = await open();
    try {
      await client.query(`set local role authenticated`);
      await client.query(`select set_config('request.jwt.claims', $1, true)`,
        [JSON.stringify({ sub: MEM_A1, role: 'authenticated' })]);
      const rows = (await client.query(`select cohort_id, status from public.feed_my_cohorts()`)).rows;
      await client.query(`reset role`);
      const ids = rows.map((r) => r.cohort_id as string);
      expect(ids).toContain(COH_A);
      expect(ids, '수료 기수도 피드가 산다').toContain(COH_ARCH);
      expect(ids, '휴지통 차수는 피드가 없다').not.toContain(COH_TRASH);
      expect(ids, '다른 기수는 보이지 않는다').not.toContain(COH_B);
      expect(rows[0].status, '기본 선택은 가장 최근 활성 기수').toBe('active');
    } finally { await close(client); }
  });

  it('소식 댓글 — 비로그인은 읽고 쓰지 못한다. 초안에는 붙지 않는다', async () => {
    const client = await open();
    try {
      await runAs(client, MEM_B1, `select public.news_comment_create('${NEWS_PUB}','좋은 소식')`);
      await expectRaise(client, MEM_B1, `select public.news_comment_create('${NEWS_DRAFT}','초안')`, 'P0002');

      // 비로그인(anon) — 읽기 ○ / 쓰기 ✕
      await client.query(`set local role anon`);
      await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ role: 'anon' })]);
      const n = (await client.query(`select count(*)::int as c from public.news_comment_list('${NEWS_PUB}')`)).rows[0].c;
      expect(Number(n), '비로그인도 소식 댓글을 읽는다').toBe(1);
      // raise 는 트랜잭션을 중단시킨다 — savepoint 로 감싸야 뒤 검증이 이어진다(asRole.runAs 와 같은 처리).
      let denied = '';
      await client.query('savepoint anon_write');
      try {
        await client.query(`select public.news_comment_create('${NEWS_PUB}','익명')`);
        await client.query('release savepoint anon_write');
      } catch (e) {
        denied = (e as { code?: string }).code ?? '';
        await client.query('rollback to savepoint anon_write');
        await client.query('release savepoint anon_write');
      }
      await client.query(`reset role`);
      expect(denied, '비로그인 쓰기는 실행 권한에서 막힌다').toBe('42501');
    } finally { await close(client); }
  });

  it('소식 댓글 삭제 — 본인·운영자·그 소식 작성자만', async () => {
    const client = await open();
    try {
      await runAs(client, MEM_B1, `select public.news_comment_create('${NEWS_PUB}','댓글')`);
      const cid = (await client.query(`select id from public.news_comments where post_id='${NEWS_PUB}'`)).rows[0].id;
      await expectRaise(client, MEM_A1, `select public.news_comment_delete('${cid}')`, '42501');
      await runAs(client, ADMIN, `select public.news_comment_delete('${cid}')`); // 소식 작성자이자 운영자
      expect(await countAs(client, MEM_B1, `select count(*) from public.news_comment_list('${NEWS_PUB}')`)).toBe(0);
    } finally { await close(client); }
  });

  it('테이블 직접 쓰기 권한이 0이다 — 쓰기는 전부 RPC 경유', async () => {
    const client = await open();
    try {
      for (const [t, r, p, exp] of [
        ['public.feed_posts', 'authenticated', 'INSERT', false],
        ['public.feed_posts', 'authenticated', 'UPDATE', false],
        ['public.feed_posts', 'authenticated', 'DELETE', false],
        ['public.feed_posts', 'anon', 'SELECT', false],
        ['public.feed_comments', 'authenticated', 'INSERT', false],
        ['public.feed_reactions', 'authenticated', 'INSERT', false],
        ['public.news_comments', 'authenticated', 'INSERT', false],
        ['public.news_comments', 'anon', 'SELECT', true],
      ] as [string, string, string, boolean][]) {
        const got = (await client.query(`select has_table_privilege('${r}','${t}','${p}') as g`)).rows[0].g;
        expect(got, `${t} / ${r} / ${p}`).toBe(exp);
      }
    } finally { await close(client); }
  });
});
