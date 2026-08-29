// 기본 권한 잠금 — **목록을 외우지 않고 `pg_default_acl` 을 읽는다**(지휘부 판정 2026-08-30).
//
// **왜 목록을 적으면 안 되나**: 「표를 걷어라」도 「표와 함수를 걷어라」도 틀리다.
//   **목록을 코드에 적으면 다음 종류가 나올 때 또 놓친다** — 이번에 **함수**가 그랬다.
//   서가 B 본문이 표만 걷고 함수를 놓쳤고, 그것은 「표를 걷어라」를 지켰기 때문이다.
//
// ★ **셋째 종류가 실재한다** — `public` 에 시퀀스는 0개라 지금은 무해하나
//   `pg_default_acl` 에 **시퀀스 항목이 서 있다**(`anon=rwU`).
//   누가 `serial` 컬럼을 하나 쓰는 순간 시퀀스가 생기고 **거기에 권한이 자동으로 붙는다.**
//
// ★ **소유자가 둘이다** — `postgres` 와 `supabase_admin`.
//   **마이그레이션이 어느 역할로 도느냐에 따라 붙는 default 가 갈린다.**
//
// **종류 목록은 따라가야 하는 값이다**(값의 두 분류 ⑴) — 여기에 박지 않고
//   `pg_default_acl` 을 **매번 읽어서** 그 자리에서 목록을 만든다. 박으면 낡는다.
//
// 기본 SKIP — 실DB 옵트인:
//   RUN_RLS_INTEGRATION=1 SUPABASE_DB_URL="postgres://…" npm test
import { describe, it, expect } from 'vitest';
import { Client } from 'pg';

const ENABLED = process.env.RUN_RLS_INTEGRATION === '1' && !!process.env.SUPABASE_DB_URL;

/** 참여자·익명이 쓰는 두 역할. 이 둘에 기본으로 권한이 붙는 것이 문제의 뿌리다. */
const EXPOSED_ROLES = ['anon', 'authenticated'] as const;

/** 서가가 걷어야 하는 표. **이것은 우리가 만든 것이라 얼어야 하는 값이다**(값의 두 분류 ⑵). */
const LIBRARY_TABLES = [
  'library_items', 'library_tags', 'library_item_tags',
  'library_reactions', 'library_comments', 'library_reports',
] as const;

async function connect() {
  const db = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  return db;
}

describe.skipIf(!ENABLED)('★ 기본 권한 — pg_default_acl 을 읽어서 잠근다', () => {
  it('종류 목록을 **박지 않고 읽는다** — 그리고 소유자가 둘임을 확인한다', async () => {
    const db = await connect();
    try {
      const { rows } = await db.query(`
        select coalesce(r.rolname,'(전역)') as owner, d.defaclobjtype::text as kind,
               array_to_string(d.defaclacl,' | ') as acl
          from pg_default_acl d
          left join pg_roles r on r.oid = d.defaclrole
          left join pg_namespace n on n.oid = d.defaclnamespace
         where n.nspname = 'public'`);
      // **물 것이 실재하는가** — 항목이 0 이면 이 잠금은 아무것도 증명하지 못한다(계열 ⑦).
      expect(rows.length, 'pg_default_acl 에 public 항목이 없다 — 잴 것이 없다').toBeGreaterThan(0);

      // ★ 소유자가 둘이다. 하나만 있으면 다른 하나로 도는 마이그레이션이 다른 default 를 받는다.
      const owners = new Set(rows.map((r) => r.owner as string));
      expect(owners.size, `소유자가 ${[...owners].join(', ')} 뿐이다 — 갈래가 줄면 잠금도 좁아진다`)
        .toBeGreaterThanOrEqual(2);

      // 어느 종류든 anon·authenticated 에 기본 권한이 붙어 있다는 사실 자체를 기록한다.
      //   붙지 않게 바뀌었다면 그것도 알아야 한다 — 그때는 이 잠금의 전제가 바뀐 것이다.
      const exposed = rows.filter((r) => EXPOSED_ROLES.some((role) => (r.acl as string).includes(`${role}=`)));
      expect(exposed.length, '어느 종류에도 anon/authenticated 기본 권한이 없다 — 전제가 바뀌었다')
        .toBeGreaterThan(0);
    } finally {
      await db.end();
    }
  });

  it('★ `pg_default_acl` 에 있는 **모든 종류**에 대해 서가가 걷혔는가', async () => {
    const db = await connect();
    try {
      // 목록을 여기서 만든다 — 코드에 적지 않는다.
      const { rows: kinds } = await db.query(`
        select distinct d.defaclobjtype::text as kind
          from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
         where n.nspname = 'public'`);
      const kindSet = new Set(kinds.map((k) => k.kind as string));

      const failures: string[] = [];

      // ── 표(r): 서가 표 여섯이 두 역할 모두에서 걷혔는가.
      if (kindSet.has('r')) {
        const { rows } = await db.query(
          `select t as name, r as role,
                  (has_table_privilege(r, 'public.'||t, 'SELECT')
                   or has_table_privilege(r, 'public.'||t, 'INSERT')
                   or has_table_privilege(r, 'public.'||t, 'UPDATE')
                   or has_table_privilege(r, 'public.'||t, 'DELETE')) as any_priv
             from unnest($1::text[]) t cross join unnest($2::text[]) r`,
          [LIBRARY_TABLES as unknown as string[], EXPOSED_ROLES as unknown as string[]],
        );
        for (const r of rows) if (r.any_priv) failures.push(`표 ${r.name} 에 ${r.role} 권한이 남았다`);
      }

      // ── 함수(f): 서가 함수 중 **일부러 연 둘**을 뺀 나머지가 anon 에서 걷혔는가.
      //   여는 둘은 결재 ⑶ 이 정한 것이고, 그 둘조차 이름으로 못 박지 않고 **여기 한 곳**에만 적는다.
      if (kindSet.has('f')) {
        const OPEN_TO_ANON = ['library_list', 'library_comment_list', 'library_open',
                              'library_can_view', 'library_can_view_path', 'library_inline_photo_max_bytes'];
        const { rows } = await db.query(
          `select p.proname as name
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname like 'library%'
              and has_function_privilege('anon', p.oid, 'EXECUTE')`);
        for (const r of rows) {
          if (!OPEN_TO_ANON.includes(r.name as string)) failures.push(`함수 ${r.name} 에 anon 실행권이 남았다`);
        }
      }

      // ── 시퀀스(S): ★ 지금 public 에 시퀀스는 0개다. **0 이어도 잠금은 선다** —
      //   누가 `serial` 을 쓰는 순간 생기고 거기에 `anon=rwU` 가 자동으로 붙는다.
      if (kindSet.has('S')) {
        const { rows } = await db.query(
          `select c.relname as name, r as role
             from pg_class c join pg_namespace n on n.oid = c.relnamespace
             cross join unnest($1::text[]) r
            where n.nspname = 'public' and c.relkind = 'S'
              and has_sequence_privilege(r, c.oid, 'USAGE')`,
          [EXPOSED_ROLES as unknown as string[]],
        );
        for (const r of rows) failures.push(`시퀀스 ${r.name} 에 ${r.role} 권한이 붙어 있다`);
      }

      expect(failures, failures.join(' / ')).toHaveLength(0);
    } finally {
      await db.end();
    }
  });

  it('★ 새로 만들면 실제로 붙는다 — **전제를 값으로 확인한다**(롤백)', async () => {
    // 「기본 권한이 붙는다」는 주석이 아니라 **이 자리에서 확인되는 사실**이어야 한다.
    //   붙지 않는다면 위 잠금들은 «막을 것이 없는 초록» 이 된다.
    const db = await connect();
    try {
      await db.query('begin');
      await db.query('create table public.__probe_defacl (id int)');
      await db.query('create sequence public.__probe_defacl_seq');
      const { rows } = await db.query(`
        select has_table_privilege('authenticated','public.__probe_defacl','SELECT') as t_auth,
               has_sequence_privilege('anon','public.__probe_defacl_seq','USAGE')    as s_anon`);
      // 둘 중 **하나라도** 붙으면 전제가 살아 있다. 종류마다 다를 수 있으므로 or 로 본다.
      expect(rows[0].t_auth || rows[0].s_anon,
        '새로 만들어도 기본 권한이 안 붙는다 — 이 파일의 다른 잠금들이 헛돈다').toBe(true);
      await db.query('rollback');
    } finally {
      await db.end();
    }
  });
});
