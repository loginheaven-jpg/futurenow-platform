// 배포 후 실측 — **배포 전과 같은가**(지휘부 조건 2026-08-29).
//
// 셋을 잰다:
//   ⑴ 전체공개 사진이 **로그아웃에서 보이고** 회원 전용은 **안 보인다**(대조 쌍 · 배포 전과 같아야 한다)
//   ⑵ 목록이 **못 보는 자료의 표지 사진을 싣지 않는다**(급소)
//   ⑶ 상한 위 이미지는 목록에 안 그려진다
//
// **대조군을 함께 넣는다** — 넷이 갈려야 잰 것이 있다.
// **뒤처리**: 만든 것을 전부 지우고 0 을 확인한다.
import { readFileSync, writeFileSync } from 'node:fs';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf8');
const g = (k) => ((env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1] || '').trim();
const BASE = 'https://future.yebom.org';
const MARK = '[배포후]';
const found = [];
const note = (k, v) => { console.log(`  ${k}: ${v}`); found.push(`${k}: ${v}`); };

const db = new pg.Client({ connectionString: g('SUPABASE_DB_URL'), ssl: { rejectUnauthorized: false } });
const admin = createClient(g('NEXT_PUBLIC_SUPABASE_URL'), g('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const anon = createClient(g('NEXT_PUBLIC_SUPABASE_URL'), g('NEXT_PUBLIC_SUPABASE_ANON_KEY'), { auth: { persistSession: false } });

const png = async (px) => (await import('sharp')).default({
  create: { width: px, height: px, channels: 3, background: { r: 20, g: 90, b: 160 } },
}).png().toBuffer();

const made = [];
try {
  await db.connect();
  const { rows: [author] } = await db.query(`select id from auth.users where email=$1`, [g('QA_COACH_EMAIL')]);
  if (!author) throw new Error('QA 인도자 계정이 없다');

  const small = await png(1200);                         // 작다 — 상한 안
  const big = Buffer.concat([await png(1200), Buffer.alloc(6 * 1024 * 1024, 9)]); // 상한 위(6MB+)
  note('만든 파일', `작은 것 ${small.length}B · 큰 것 ${big.length}B (상한 5242880)`);

  const plan = [
    { tier: 'public', buf: small, why: '전체공개 · 상한 안 → **보여야** 한다' },
    { tier: 'forum',  buf: small, why: '회원 전용 → 로그아웃엔 **안 보여야** 한다' },
    { tier: 'coach',  buf: small, why: '인도자 전용 → 참여자·익명에 **안 보여야** 한다' },
    { tier: 'public', buf: big,   why: '전체공개지만 **상한 위** → 목록에 **안 실려야** 한다', tag: '큰' },
  ];
  for (const p of plan) {
    // 저장소 키는 ASCII 만 받는다(실측: `Invalid key`). 화면에 뜨는 이름과 저장 경로는 다른 것이다.
    const path = `probe/post-${p.tier}-${p.tag ? 'big' : 'small'}-${Date.now()}.png`;
    const up = await admin.storage.from('library').upload(path, p.buf, { contentType: 'image/png' });
    if (up.error) throw new Error(`올리기 실패: ${up.error.message}`);
    const { rows: [row] } = await db.query(
      `insert into public.library_items (title, tier, kind, storage_path, created_by)
       values ($1,$2,'file',$3,$4) returning id`,
      [`${MARK} ${p.tier} ${p.tag ?? '작은'}`, p.tier, path, author.id]);
    made.push({ ...p, id: row.id, path });
  }

  // ── ⑴⑵ 로그아웃(익명)이 목록에서 받는 것
  const { data: list, error } = await anon.rpc('library_list');
  if (error) throw new Error(`목록 실패: ${error.message}`);
  const mine = (list ?? []).filter((x) => String(x.title).startsWith(MARK));
  note('익명 목록에 선 자료 수', `${mine.length} (넷 다 서야 한다 — 못 보는 것도 제목은 선다)`);
  for (const m of made) {
    const row = mine.find((x) => x.id === m.id);
    note(`⑴⑵ ${m.tier}/${m.tag ?? '작은'}`, `can_view=${row?.can_view} · photo=${row?.photo}  ← ${m.why}`);
  }

  // ★ 급소: can_view 가 거짓인데 photo 가 참인 것이 하나라도 있으면 표지 사진이 샌다.
  const leak = mine.filter((x) => x.can_view === false && x.photo === true);
  note('★ can_view=false 인데 photo=true 인 자료', leak.length === 0 ? '0 — 새지 않는다' : `★★ ${leak.length}건 샌다`);

  // ── ⑶ 상한: 전체공개인데 큰 것은 photo 가 거짓이어야 한다(대조군은 작은 것)
  const bigRow = mine.find((x) => x.id === made.find((m) => m.tag === '큰').id);
  const smallRow = mine.find((x) => x.id === made.find((m) => m.tier === 'public' && !m.tag).id);
  note('⑶ 상한 대조', `작은 공개 photo=${smallRow?.photo} / 큰 공개 photo=${bigRow?.photo} — 앞이 참, 뒤가 거짓이어야 한다`);

  // ── 프록시 실물(배포 전과 같은가)
  for (const m of made) {
    const r = await fetch(`${BASE}/library/${m.id}/file`, { cache: 'no-store', redirect: 'manual' });
    const bytes = r.ok ? (await r.arrayBuffer()).byteLength : 0;
    note(`로그아웃 프록시 · ${m.tier}/${m.tag ?? '작은'}`, `${r.status} · ${bytes}B`);
  }

  // ── 화면이 실제로 그리는가(익명으로 목록 HTML 을 본다)
  const html = await (await fetch(`${BASE}/library`, { cache: 'no-store' })).text();
  const imgs = [...html.matchAll(/\/library\/([0-9a-f-]{36})\/file/g)].map((x) => x[1]);
  for (const m of made) {
    const drawn = imgs.includes(m.id);
    note(`화면이 그리는가 · ${m.tier}/${m.tag ?? '작은'}`, drawn ? 'O 사진이 실렸다' : '없다');
  }
} finally {
  for (const m of made) {
    await admin.storage.from('library').remove([m.path]).catch(() => {});
    await db.query('delete from public.library_items where id=$1', [m.id]).catch(() => {});
  }
  const { rows: [left] } = await db.query(`select count(*)::int n from public.library_items where title like $1`, [`${MARK}%`]).catch(() => ({ rows: [{ n: '?' }] }));
  const { rows: [obj] } = await db.query(`select count(*)::int n from storage.objects where bucket_id='library' and name like 'probe/%'`).catch(() => ({ rows: [{ n: '?' }] }));
  console.log(`\n뒤처리 — 지운 자료 ${made.length}개 · 남은 실측 자료 ${left.n} · 남은 probe 객체 ${obj.n}`);
  writeFileSync('docs/shots/postdeploy-photo.json', JSON.stringify(found, null, 2), 'utf8');
  await db.end().catch(() => {});
}
