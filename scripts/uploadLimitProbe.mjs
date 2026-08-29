// 올리기 상한 실측 — **참여자가 실제로 부딪히는 벽**(지휘부 조건 2026-08-29).
//
// 내려받기(프록시)만 재면 창이 좁다. 자료는 **올라가야** 생기고, 올리는 길은
//   브라우저 → **서버 액션**(`uploadLibraryFileAction`) → 저장소다.
//   서버 액션은 **요청 본문**으로 파일을 나르므로 함수의 **본문 크기 제한**에 먼저 걸린다.
//
// **화면을 그대로 쓴다** — `fetch` 로 흉내 내지 않는다. 흉내 낸 경로는 참여자가 걷는 길이 아니다.
//   QA 인도자로 로그인해 `/library` 의 올리기 구획에 파일을 물리고 「올리기」를 누른다.
//
// **치운다**: 만든 자료는 매번 지우고 끝에 0 을 확인한다.
// **실기수·실계정 무접촉**: 자료만 만들고 지운다.
//
// 사용: node scripts/uploadLimitProbe.mjs [기준URL]
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'https://future.yebom.org';
const env = readFileSync('.env.local', 'utf8');
const g = (k) => ((env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1] || '').trim();
const MB = 1024 * 1024;
const SIZES_MB = (process.env.SIZES ?? '1,3,4,4.4,5,6').split(',').map(Number);

const db = new pg.Client({ connectionString: g('SUPABASE_DB_URL'), ssl: { rejectUnauthorized: false } });
const sb = createClient(g('NEXT_PUBLIC_SUPABASE_URL'), g('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

async function sweep() {
  const { rows } = await db.query(`select id, storage_path from public.library_items where title like '[검증]%'`);
  for (const r of rows) {
    if (r.storage_path) await sb.storage.from('library').remove([r.storage_path]).catch(() => {});
    await db.query('delete from public.library_items where id=$1', [r.id]).catch(() => {});
  }
  return rows.length;
}

const files = [];
try {
  await db.connect();
  console.log(`시작 전 library_items ${(await db.query('select count(*)::int n from public.library_items')).rows[0].n}행\n`);

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'load', timeout: 30000 });
  await page.getByLabel(/이메일/).fill(g('QA_COACH_EMAIL'));
  await page.getByLabel(/비밀번호/).fill(g('QA_COACH_PASSWORD'));
  await page.getByRole('button', { name: /로그인/ }).click();
  await page.waitForURL(/\/(home|coach|admin)/, { timeout: 30000 });

  console.log('크기     결과        걸린시간   화면이 하는 말');
  for (const mb of SIZES_MB) {
    const f = join(tmpdir(), `probe-${mb}mb.bin`);
    writeFileSync(f, Buffer.alloc(Math.round(mb * MB), 7));
    files.push(f);

    await page.goto(`${BASE}/library`, { waitUntil: 'load', timeout: 30000 });
    await page.getByRole('button', { name: /자료 올리기/ }).click();
    await page.getByLabel('제목').fill(`[검증] 올리기 상한 ${mb}MB`);
    await page.locator('input[type="file"]').setInputFiles(f);
    await page.locator('select').first().selectOption('coach'); // 인도자 등급 — 참여자에게 안 보인다
    const t0 = Date.now();
    await page.getByRole('button', { name: /^올리기$/ }).click();

    // **조건으로 끝낸다** — 목록에 뜨거나(성공) 화면이 말을 하거나(실패). 상한 60초.
    let outcome = '상한 초과(60초)';
    let msg = '';
    try {
      await page.waitForFunction((t) => {
        const b = document.body.innerText || '';
        return b.includes(t) || /지금은 올릴 수 없습니다|파일을 고르지 못했습니다|로그인이 필요합니다/.test(b);
      }, `[검증] 올리기 상한 ${mb}MB`, { timeout: 60000 });
      const body = await page.evaluate(() => document.body.innerText || '');
      if (body.includes(`[검증] 올리기 상한 ${mb}MB`)) {
        outcome = 'O 올라갔다';
        // ★ **올라간 것으로 끝내지 않는다** — 프록시로 되받아 **바이트가 온전한지**까지 본다.
        const { rows: [it] } = await db.query(
          `select id from public.library_items where title = $1 order by created_at desc limit 1`,
          [`[검증] 올리기 상한 ${mb}MB`]);
        if (it) {
          const back = await page.evaluate(async (id) => {
            const res = await fetch(`/library/${id}/file`, { cache: 'no-store' });
            const buf = await res.arrayBuffer();
            return { s: res.status, len: buf.byteLength };
          }, it.id);
          msg = back.s === 200 && back.len === Math.round(mb * MB) ? '· 되받기 온전' : `· ★ 되받기 ${back.s}/${back.len}바이트`;
        }
      }
      else { outcome = '★ 실패'; msg = (body.match(/지금은 올릴 수 없습니다[^\n]*/) || [''])[0]; }
    } catch { /* 상한 초과 */ }
    const ms = Date.now() - t0;
    console.log(`${String(mb).padEnd(5)}MB ${outcome.padEnd(12)} ${String(ms + 'ms').padEnd(9)} ${msg}`);
  }
  await b.close();
} finally {
  const n = await sweep().catch(() => '?');
  for (const f of files) { try { unlinkSync(f); } catch { /* 이미 없다 */ } }
  const after = await db.query('select count(*)::int n from public.library_items').catch(() => ({ rows: [{ n: '?' }] }));
  const objs = await db.query(`select count(*)::int n from storage.objects where bucket_id='library'`).catch(() => ({ rows: [{ n: '?' }] }));
  console.log(`\n치운 검증 자료 ${n}개 · 남은 library_items ${after.rows[0].n}행 · storage.objects ${objs.rows[0].n}개`);
  await db.end().catch(() => {});
}
