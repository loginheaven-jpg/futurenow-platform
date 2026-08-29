// 착수 전 실측 — **판정 1·3 이 실물에서 성립하는가**(사진 인라인 A 확장).
//
// 판정 1 「전체공개는 로그아웃해도 보인다」는 **정책 문장으로만** 확인했다(can_view 갈래 순서).
//   정책이 그렇다고 **프록시가 실제로 흘리는 것은 아니다** — 저장소 RLS 가 anon 을 어떻게 보는지,
//   서버 컨텍스트가 세션 없이 도는지는 **다른 층**이다(⑨-c: 창의 층이 대상의 층과 다르다).
//   그래서 **실제로 로그아웃 요청을 넣어 본다.**
//
// 판정 3 「사용성 저해하지 않는 선」 — 원본이 50MB 면 목록이 무너진다.
//   저장소가 **변환(리사이즈)을 내주는지**를 재야 썸네일이라는 선택지가 실재한다.
//
// **대조군을 함께 넣는다** — public 하나 · forum 하나. 둘이 갈려야 잰 것이 있다.
// **뒤처리**: 만든 것을 전부 지우고 0 을 확인한다.
import { readFileSync, writeFileSync } from 'node:fs';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf8');
const g = (k) => ((env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1] || '').trim();
const BASE = process.env.PROBE_BASE ?? 'https://future.yebom.org';
const MARK = '[실측-사진]';
const found = [];
const note = (k, v) => { console.log(`  ${k}: ${v}`); found.push(`${k}: ${v}`); };

const db = new pg.Client({ connectionString: g('SUPABASE_DB_URL'), ssl: { rejectUnauthorized: false } });
const admin = createClient(g('NEXT_PUBLIC_SUPABASE_URL'), g('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

/** 1×1 이 아니라 **볼 수 있는 크기**의 PNG 를 만든다 — 변환이 실제로 줄이는지 보려면 클수록 좋다. */
function bigPng() {
  // 800×800 단색 PNG 를 손으로 짓지 않고, sharp 로 만든다(이미 의존성에 있다).
  return import('sharp').then((m) => m.default({
    create: { width: 1200, height: 1200, channels: 3, background: { r: 20, g: 90, b: 160 } },
  }).png().toBuffer());
}

const made = [];
try {
  await db.connect();
  const { rows: [author] } = await db.query(`select id from auth.users where email=$1`, [g('QA_COACH_EMAIL')]);
  if (!author) throw new Error('QA 인도자 계정이 없다 — qaCohort.mjs up 을 먼저 돌려라');

  const buf = await bigPng();
  note('만든 원본', `${buf.length} bytes (1200×1200 png)`);

  for (const tier of ['public', 'forum']) {
    const path = `probe/${tier}-${Date.now()}.png`;
    const up = await admin.storage.from('library').upload(path, buf, { contentType: 'image/png' });
    if (up.error) throw new Error(`올리기 실패(${tier}): ${up.error.message}`);
    const { rows: [row] } = await db.query(
      `insert into public.library_items (title, tier, kind, storage_path, created_by)
       values ($1,$2,'file',$3,$4) returning id`,
      [`${MARK} ${tier}`, tier, path, author.id]);
    made.push({ id: row.id, path, tier });
  }
  const pub = made.find((m) => m.tier === 'public');
  const priv = made.find((m) => m.tier === 'forum');

  // ── ★ 실측 ⑴ 로그아웃으로 프록시를 연다(대조 쌍)
  for (const m of made) {
    const r = await fetch(`${BASE}/library/${m.id}/file`, { cache: 'no-store', redirect: 'manual' });
    const bytes = r.ok ? (await r.arrayBuffer()).byteLength : 0;
    note(`⑴ 로그아웃 · ${m.tier} 파일`, `${r.status} · ${r.headers.get('content-type') ?? '-'} · ${bytes} bytes`);
  }

  // ── ★ 실측 ⑵ 로그아웃으로 목록을 부른다 — public 이 실제로 서는가
  const anonSb = createClient(g('NEXT_PUBLIC_SUPABASE_URL'), g('NEXT_PUBLIC_SUPABASE_ANON_KEY'), { auth: { persistSession: false } });
  const { data: list, error: le } = await anonSb.rpc('library_list');
  const titles = (list ?? []).filter((x) => String(x.title).startsWith(MARK)).map((x) => `${x.title}(can_view=${x.can_view})`);
  note('⑵ 로그아웃 목록에 선 것', le ? `오류 ${le.message}` : (titles.join(' | ') || '(없음)'));

  // ── ★ 실측 ⑶ 저장소 변환(썸네일)이 되는가 — 판정 3 의 선택지가 실재하는지
  for (const w of [400, null]) {
    const opt = w ? { transform: { width: w, quality: 70 } } : undefined;
    const { data, error } = await admin.storage.from('library').download(pub.path, opt);
    note(`⑶ 변환 ${w ? w + 'px' : '원본'}`, error ? `★ 안 된다 — ${error.message}` : `${(await data.arrayBuffer()).byteLength} bytes · ${data.type}`);
  }

  // ── ★ 실측 ⑷ 이미지인지 무엇으로 아는가 — 표에 mime 열이 없다. 확장자뿐인가
  const { rows } = await db.query(
    `select count(*) filter (where storage_path ~* '\.(png|jpe?g|gif|webp|avif)$') as 이미지꼴,
            count(*) as 전체 from public.library_items where storage_path is not null`);
  note('⑷ 저장 경로가 이미지 확장자인 자료', `${rows[0].이미지꼴}/${rows[0].전체} — 표에 mime 열이 없다`);
  note('⑷ 그래서', priv ? '판정 근거는 storage_path 확장자뿐이다' : '');
} finally {
  for (const m of made) {
    await admin.storage.from('library').remove([m.path]).catch(() => {});
    await db.query('delete from public.library_items where id=$1', [m.id]).catch(() => {});
  }
  const { rows: [left] } = await db.query(`select count(*)::int n from public.library_items where title like $1`, [`${MARK}%`]).catch(() => ({ rows: [{ n: '?' }] }));
  const { rows: [obj] } = await db.query(`select count(*)::int n from storage.objects where bucket_id='library' and name like 'probe/%'`).catch(() => ({ rows: [{ n: '?' }] }));
  console.log(`\n뒤처리 — 지운 자료 ${made.length}개 · 남은 실측 자료 ${left.n} · 남은 probe 객체 ${obj.n}`);
  writeFileSync('docs/shots/probe-public-photo.json', JSON.stringify(found, null, 2), 'utf8');
  await db.end().catch(() => {});
}
