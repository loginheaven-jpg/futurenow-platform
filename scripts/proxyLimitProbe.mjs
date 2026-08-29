// 프록시 상한 실측 — **재서 정한다. 지어내지 않는다**(지휘부 조건 2026-08-29).
//
// **왜 지금인가**: `library_items` 가 **0행**인 지금이 이것을 닫을 자리다. 첫 자료가 올라간 뒤에는 늦다.
//
// **무엇을 재는가**: `/library/[id]/file` 은 서버가 파일을 **중계**한다(서명 URL 을 버린 대가다).
//   그래서 함수의 **응답 크기·실행 시간** 제한에 걸릴 수 있다. 그 벽이 어디인지 **실물로** 찾는다.
//
// **노출을 최소로 한다**:
//   · 자료를 `hidden_at` 을 세워 넣는다 → 목록·열람이 **본인(QA 인도자)과 운영자에게만** 열린다.
//   · 이름에 `[검증]` 을 박는다.
//   · 끝나면 **전부 지우고 0 을 확인한다**(그 확인까지가 이 도구의 일이다).
//
// **실기수·실계정 무접촉**: `cohorts`·`enrollments`·`memberships` 를 한 줄도 건드리지 않는다.
//   QA 인도자 계정은 **소유자로 적기만** 하고 그 계정의 행을 바꾸지 않는다.
//
// 사용: node scripts/proxyLimitProbe.mjs [기준URL]
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'https://future.yebom.org';
const env = readFileSync('.env.local', 'utf8');
const g = (k) => ((env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1] || '').trim();

const MB = 1024 * 1024;
/** 벽을 사이에 두도록 고른 크기들. 촘촘한 구간이 곧 답이 나올 자리다. */
const SIZES_MB = (process.env.SIZES ?? '0.5,2,4,4.4,4.6,5,8,12').split(',').map(Number);

const db = new pg.Client({ connectionString: g('SUPABASE_DB_URL'), ssl: { rejectUnauthorized: false } });
const sb = createClient(g('NEXT_PUBLIC_SUPABASE_URL'), g('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

const made = [];
async function cleanup() {
  for (const m of made) {
    await sb.storage.from('library').remove([m.path]).catch(() => {});
    await db.query('delete from public.library_items where id = $1', [m.id]).catch(() => {});
  }
}

try {
  await db.connect();
  const { rows: [me] } = await db.query(
    `select id from auth.users where email = $1`, [g('QA_COACH_EMAIL')],
  );
  if (!me) throw new Error('QA 인도자 계정을 찾지 못했다');

  const before = await db.query(`select count(*)::int n from public.library_items`);
  console.log(`시작 전 library_items ${before.rows[0].n}행`);

  // ── 넣기
  for (const mb of SIZES_MB) {
    const bytes = Buffer.alloc(Math.round(mb * MB), 7);
    const path = `_probe/${randomUUID()}.bin`;
    const up = await sb.storage.from('library').upload(path, bytes, { contentType: 'application/octet-stream' });
    if (up.error) { console.log(`  ${mb}MB 업로드 실패: ${up.error.message}`); continue; }
    const { rows: [row] } = await db.query(
      `insert into public.library_items (title, tier, kind, storage_path, created_by, hidden_at)
       values ($1,'coach','file',$2,$3, now()) returning id`,
      [`[검증] 프록시 상한 ${mb}MB`, path, me.id],
    );
    made.push({ id: row.id, path, mb, bytes: bytes.length });
  }
  console.log(`검증 자료 ${made.length}개 넣음(전부 가려 둠 — 본인·운영자만 보인다)`);

  // ── 재기: QA 인도자로 로그인해 프록시를 지난다
  const b = await chromium.launch();
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'load', timeout: 30000 });
  await page.getByLabel(/이메일/).fill(g('QA_COACH_EMAIL'));
  await page.getByLabel(/비밀번호/).fill(g('QA_COACH_PASSWORD'));
  await page.getByRole('button', { name: /로그인/ }).click();
  await page.waitForURL(/\/(home|coach|admin)/, { timeout: 30000 });

  console.log('\n크기      상태  받은바이트    걸린시간   비고');
  const out = [];
  for (const m of made) {
    const t0 = Date.now();
    const r = await page.evaluate(async (id) => {
      try {
        const res = await fetch(`/library/${id}/file`, { cache: 'no-store' });
        const buf = await res.arrayBuffer();
        return { status: res.status, len: buf.byteLength, err: null,
                 vercelErr: res.headers.get('x-vercel-error'), ct: res.headers.get('content-type') };
      } catch (e) { return { status: 'ERR', len: 0, err: String(e).slice(0, 80) }; }
    }, m.id);
    const ms = Date.now() - t0;
    const okSize = r.len === m.bytes;
    out.push({ ...m, ...r, ms, okSize });
    console.log(`${String(m.mb).padEnd(6)}MB ${String(r.status).padEnd(5)} ${String(r.len).padEnd(12)} ${String(ms + 'ms').padEnd(9)} ${okSize ? '온전' : '★ 다르다'} ${r.vercelErr ?? ''} ${r.err ?? ''}`);
  }
  await b.close();

  // ── 벽이 어디인가
  const good = out.filter((o) => o.status === 200 && o.okSize).map((o) => o.mb);
  const bad = out.filter((o) => !(o.status === 200 && o.okSize)).map((o) => o.mb);
  console.log(`\n온전히 받은 최대  ${good.length ? Math.max(...good) + 'MB' : '없음'}`);
  console.log(`실패한 최소      ${bad.length ? Math.min(...bad) + 'MB' : '없음'}`);
} finally {
  await cleanup();
  const after = await db.query(`select count(*)::int n from public.library_items`).catch(() => ({ rows: [{ n: '?' }] }));
  const objs = await db.query(`select count(*)::int n from storage.objects where bucket_id='library'`).catch(() => ({ rows: [{ n: '?' }] }));
  console.log(`\n치운 뒤 library_items ${after.rows[0].n}행 · storage.objects ${objs.rows[0].n}개`);
  await db.end().catch(() => {});
}
