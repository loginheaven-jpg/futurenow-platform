// 워크북 사진 「인도자 열람」 — **역할별로 실DB 에서 잰다**(ADR-197 · CLAUDE §11 보안 보고 「역할별 실측」).
//
// 전 과정 `BEGIN … ROLLBACK` — 실데이터 한 행도 변하지 않는다. 사진 행(storage.objects)도 트랜잭션 안에서만
//   서고 바이트가 없다. 정책은 행을 보고 판정하므로 바이트가 필요 없다.
//
// **적용 전후 둘 다 돈다.** 원장에 없으면 본문을 트랜잭션 안에서 먼저 적용한다 —
//   적용 전에는 「이 마이그레이션이 옳은가」를, 적용 뒤에는 「실물이 옳은가」를 잰다. 스킵하지 않는다.
//
// 픽스처는 **QA 회기와 QA 계정 셋**이다(실기수 접근 0). 이름·스키마를 지어내지 않는다 —
//   계정은 env 이메일로 찾고, 역할(운영자·담당 인도자·회기 멤버)은 첫 단언이 실물 함수로 확인한다.
//   「남」은 어떤 행에도 없는 uuid 다 — authenticated 로 들어온 제3자.
//
// 돌리는 법:
//   RUN_RLS_INTEGRATION=1 SUPABASE_DB_URL=… QA_USER_EMAIL=… QA_COACH_EMAIL=… QA_ADMIN_EMAIL=… QA_COHORT_CODE=… \
//     npx vitest run tests/workbookPhotos.integration.test.ts
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import { countAs, runAs, scalarAs } from './helpers/asRole';

const ENV = ['SUPABASE_DB_URL', 'QA_USER_EMAIL', 'QA_COACH_EMAIL', 'QA_ADMIN_EMAIL', 'QA_COHORT_CODE'] as const;
const ENABLED = process.env.RUN_RLS_INTEGRATION === '1' && ENV.every((k) => !!process.env[k]);
const VERSION = '20260918090001';
const MIGRATION = `supabase/migrations/${VERSION}_workbook_photos.sql`;
const STRANGER = '00000000-0000-4000-8000-00000000c0de';

describe.skipIf(!ENABLED)('워크북 사진 — 「인도자 열람」 역할별 판정', () => {
  let db: Client;
  let applied = false;
  const id = { user: '', coach: '', admin: '', cohort: '' };
  let S = 0;
  let A = ''; // 원본
  let T = ''; // 미리보기

  /** 이 테스트가 심은 사진 행만 센다 — QA 계정의 다른 사진과 섞이지 않게. */
  const VISIBLE = () => `select count(*) from storage.objects where bucket_id='checkin-photos' and name in ('${A}','${T}')`;
  const LISTED = () => `select count(*) from public.checkin_photo_paths('${id.cohort}'::uuid, '${id.user}'::uuid, ${S}) where name in ('${A}','${T}')`;

  beforeAll(async () => {
    db = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
    await db.connect();
    applied = Number((await db.query(
      'select count(*)::int as n from supabase_migrations.schema_migrations where version=$1', [VERSION])).rows[0].n) > 0;
    await db.query('begin');
    await db.query(`set local lock_timeout = '5s'`);
    // 원장에 없어도 **파일이 실제로 이미 서 있을 수 있다**(대시보드 적용 등) — 표가 있으면 다시 만들지 않는다.
    const hasTable = (await db.query(`select to_regclass('public.checkin_photo_prefs') t`)).rows[0].t !== null;
    if (!applied && !hasTable) await db.query(readFileSync(MIGRATION, 'utf8'));

    const users = (await db.query('select email, id from auth.users where email = any($1)',
      [[process.env.QA_USER_EMAIL, process.env.QA_COACH_EMAIL, process.env.QA_ADMIN_EMAIL]])).rows as { email: string; id: string }[];
    const byEmail = new Map(users.map((u) => [u.email, u.id]));
    id.user = byEmail.get(process.env.QA_USER_EMAIL!) ?? '';
    id.coach = byEmail.get(process.env.QA_COACH_EMAIL!) ?? '';
    id.admin = byEmail.get(process.env.QA_ADMIN_EMAIL!) ?? '';
    id.cohort = (await db.query('select id from public.cohorts where code=$1', [process.env.QA_COHORT_CODE])).rows[0]?.id ?? '';
    S = Number((await db.query('select min(session_no)::int s from public.cohort_sessions where cohort_id=$1', [id.cohort])).rows[0]?.s ?? 0);

    // 기준선: 이 사람·회차의 선택을 비운다(트랜잭션 안 — 롤백된다). 갈무리 행과 사진 행 둘을 심는다.
    await db.query('delete from public.checkin_photo_prefs where user_id=$1 and session_no=$2', [id.user, S]);
    await db.query(
      `insert into public.checkins (cohort_id, user_id, session_no) values ($1,$2,$3)
       on conflict (cohort_id, user_id, session_no) do nothing`, [id.cohort, id.user, S]);
    A = `${id.cohort}/${id.user}/${S}/wbtest-a.jpg`;
    T = `${id.cohort}/${id.user}/${S}/wbtest-a.thumb.jpg`;
    await db.query(`insert into storage.objects (bucket_id, name) values ('checkin-photos',$1), ('checkin-photos',$2)`, [A, T]);
  });

  afterAll(async () => {
    await db?.query('rollback').catch(() => undefined);
    await db?.end();
  });

  it('⑦ 픽스처의 역할이 실재한다 — 운영자 · 담당 인도자 · 회기 멤버 · 회차', async () => {
    expect(id.user && id.coach && id.admin && id.cohort, 'QA 계정·회기를 찾지 못했다').toBeTruthy();
    expect(S).toBeGreaterThan(0);
    const r = (await db.query(
      'select public.is_admin($1) a, public.is_cohort_coach($2,$3) c, public.is_cohort_member($2,$4) m, public.is_admin($3) ca, public.is_admin($4) ua',
      [id.admin, id.cohort, id.coach, id.user])).rows[0];
    expect([r.a, r.c, r.m, r.ca, r.ua]).toEqual([true, true, true, false, false]);
  });

  it('기본(선택 없음) — 본인·인도자·운영자는 보고, 남은 못 본다', async () => {
    expect(await countAs(db, id.user, VISIBLE())).toBe(2);
    expect(await countAs(db, id.coach, VISIBLE())).toBe(2);
    expect(await countAs(db, id.admin, VISIBLE())).toBe(2);
    expect(await countAs(db, STRANGER, VISIBLE())).toBe(0);
    expect(await countAs(db, id.coach, LISTED())).toBe(2);
    expect(await countAs(db, id.admin, LISTED())).toBe(2);
    expect(await countAs(db, STRANGER, LISTED())).toBe(0);
  });

  it('본인이 해제하면 — **인도자도 운영자도** 못 본다(불변식 16) · 본인은 그대로 본다', async () => {
    await runAs(db, id.user, `select public.checkin_photo_prefs_set(${S}, false)`);
    expect(await countAs(db, id.user, VISIBLE())).toBe(2);
    expect(await countAs(db, id.user, LISTED())).toBe(2);
    expect(await countAs(db, id.coach, VISIBLE())).toBe(0);
    expect(await countAs(db, id.admin, VISIBLE())).toBe(0);
    expect(await countAs(db, id.coach, LISTED())).toBe(0);
    expect(await countAs(db, id.admin, LISTED())).toBe(0);
  });

  it('판정 함수는 남의 선택을 캐묻는 창구가 아니다 — 권한 없는 사람에게는 늘 거짓', async () => {
    const q = `select public.checkin_photos_staff_view('${id.user}', '${S}')`;
    expect(await scalarAs(db, STRANGER, q)).toBe('false');
    expect(await scalarAs(db, id.coach, q)).toBe('false'); // 해제된 상태
  });

  it('쓰기는 본인 것만 — 인도자가 RPC 를 불러도 **자기 행**이 생길 뿐 참여자 선택은 안 바뀐다', async () => {
    await runAs(db, id.coach, `select public.checkin_photo_prefs_set(${S}, true)`);
    const rows = (await db.query('select user_id, coach_view from public.checkin_photo_prefs where session_no=$1 and user_id = any($2) order by user_id',
      [S, [id.user, id.coach]])).rows as { user_id: string; coach_view: boolean }[];
    expect(rows.find((r) => r.user_id === id.user)?.coach_view).toBe(false);
    expect(await countAs(db, id.coach, VISIBLE())).toBe(0);
  });

  it('표 직접 쓰기는 막혀 있다(RPC 로만) · 읽기는 본인 행만', async () => {
    let code: string | undefined;
    try {
      await runAs(db, id.user, `update public.checkin_photo_prefs set coach_view = true where user_id='${id.user}'`);
    } catch (e) {
      code = (e as { code?: string }).code;
    }
    expect(code, '참여자가 표를 직접 고칠 수 있다 — 쓰기 권한이 남았다').toBe('42501');
    expect(await countAs(db, id.user, `select count(*) from public.checkin_photo_prefs where user_id='${id.user}'`)).toBe(1);
    expect(await countAs(db, id.coach, `select count(*) from public.checkin_photo_prefs where user_id='${id.user}'`)).toBe(0);
  });

  it('anon 은 판정 함수도 선택 쓰기도 못 부른다', async () => {
    for (const sql of [`select public.checkin_photos_staff_view('${id.user}', '${S}')`, `select public.checkin_photo_prefs_set(${S}, true)`]) {
      await db.query('savepoint anon');
      let code: string | undefined;
      try {
        await db.query('set local role anon');
        await db.query(sql);
      } catch (e) {
        code = (e as { code?: string }).code;
      }
      await db.query('rollback to savepoint anon');
      await db.query('reset role');
      expect(code, sql).toBe('42501');
    }
  });

  it('다시 체크하면 인도자·운영자에게 다시 보인다', async () => {
    await runAs(db, id.user, `select public.checkin_photo_prefs_set(${S}, true)`);
    expect(await countAs(db, id.coach, VISIBLE())).toBe(2);
    expect(await countAs(db, id.admin, VISIBLE())).toBe(2);
  });

  it('목록은 **올린 순서**다 — 워크북은 쪽 순서가 뜻이다', async () => {
    // 한 트랜잭션 안의 now() 는 같으므로 먼저 올린 사진을 과거 시각으로 심는다.
    const Z = `${id.cohort}/${id.user}/${S}/wbtest-z.jpg`;
    await db.query(`insert into storage.objects (bucket_id, name, created_at) values ('checkin-photos',$1, now() - interval '1 hour')`, [Z]);
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: id.user, role: 'authenticated' })]);
    await db.query('set local role authenticated');
    const names = (await db.query(
      `select name from public.checkin_photo_paths('${id.cohort}'::uuid, '${id.user}'::uuid, ${S}) where name like '%/wbtest-%'`)).rows.map((r) => r.name as string);
    await db.query('reset role');
    expect(names[0]).toBe(Z);
  });
});
