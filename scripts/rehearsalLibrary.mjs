// §3 서가 — **참여자 눈으로 걷는다**(ORDER rehearsal_2gi).
//
// 서가는 새로 섰는데 자료가 0건이라 **아무도 참여자 눈으로 걸어 본 적이 없다.**
//   여섯 자리를 걷고 **주소가 새지 않는지 실물로** 잰다 —
//   관문을 지난 사람의 주소를 **다른 계정에 넣어 보고 막히는지.**
//
// **고치지 않는다.** 겪은 것을 적는다.
// **뒤처리**: 만든 자료는 전부 지우고 0 을 확인한다.
import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf8');
const g = (k) => ((env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1] || '').trim();
const BASE = 'https://future.yebom.org';
const OUT = 'docs/shots/rehearsal';
mkdirSync(OUT, { recursive: true });

const db = new pg.Client({ connectionString: g('SUPABASE_DB_URL'), ssl: { rejectUnauthorized: false } });
const admin = createClient(g('NEXT_PUBLIC_SUPABASE_URL'), g('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const found = [];
const note = (k, v) => { const l = `  ${k}: ${v}`; found.push(`${k}: ${v}`); console.log(l); };

async function loginAs(ctx, who) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/login`, { waitUntil: 'load', timeout: 30000 });
  await p.getByLabel(/이메일/).fill(g(who === 'coach' ? 'QA_COACH_EMAIL' : 'QA_USER_EMAIL'));
  await p.getByLabel(/비밀번호/).fill(g(who === 'coach' ? 'QA_COACH_PASSWORD' : 'QA_USER_PASSWORD'));
  await p.getByRole('button', { name: /로그인/ }).click();
  await p.waitForURL(/\/(home|coach|admin)/, { timeout: 30000 });
  return p;
}
const settle = (p) => p.waitForFunction(() => !((document.body.innerText || '').includes('불러오는 중')), null, { timeout: 20000 });

/** 화면으로 올린다 — `fetch` 로 흉내 내지 않는다(참여자가 걷는 길이 아니다). */
async function upload(p, { title, tier, file, url, cohortLabel }) {
  await p.goto(`${BASE}/library`, { waitUntil: 'load', timeout: 30000 });
  await settle(p);
  await p.getByRole('button', { name: /자료 올리기/ }).click();
  await p.getByLabel('제목').fill(title);
  if (url) {
    await p.getByRole('radio', { name: '주소' }).check().catch(async () => {
      await p.locator('input[name="library-kind"]').nth(1).check();
    });
    await p.locator('input[placeholder="https://"]').fill(url);
  } else {
    await p.locator('input[type="file"]').setInputFiles(file);
  }
  await p.locator('select').first().selectOption(tier);
  if (cohortLabel) {
    const sel = p.locator('select').nth(1);
    if (await sel.count()) await sel.selectOption({ label: cohortLabel }).catch(() => {});
  }
  const err = await p.evaluate(() => document.body.innerText || '');
  if (/올릴 수 있어요/.test(err)) return { blocked: true, msg: (err.match(/자료는[^\n]*/) || [''])[0] };
  await p.getByRole('button', { name: /^올리기$/ }).click();
  await p.waitForFunction((t) => (document.body.innerText || '').includes(t), title, { timeout: 40000 }).catch(() => {});
  return { blocked: false };
}

const browser = await chromium.launch();
try {
  await db.connect();
  const c1 = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const c2 = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const coach = await loginAs(c1, 'coach');
  const user = await loginAs(c2, 'user');

  // ── ⑴ 인도자가 회차 자료를 올린다 → 참여자가 본다
  const f = join(tmpdir(), 'reh-1mb.bin');
  writeFileSync(f, Buffer.alloc(1024 * 1024, 7));
  await upload(coach, { title: '[리허설] 1회차 배포 자료', tier: 'forum', file: f, cohortLabel: '[QA전환] A' });
  await user.goto(`${BASE}/library`, { waitUntil: 'load' }); await settle(user);
  const seen1 = (await user.evaluate(() => document.body.innerText || '')).includes('[리허설] 1회차 배포 자료');
  note('⑴ 인도자 자료를 참여자가 보는가', seen1 ? 'O 보인다' : '★ 안 보인다');
  await user.screenshot({ path: `${OUT}/lib-1-list.png` });

  // ── ⑵ 참여자가 올린다 → 인도자가 본다
  await upload(user, { title: '[리허설] 참여자가 올린 자료', tier: 'forum', file: f });
  await coach.goto(`${BASE}/library`, { waitUntil: 'load' }); await settle(coach);
  const seen2 = (await coach.evaluate(() => document.body.innerText || '')).includes('[리허설] 참여자가 올린 자료');
  note('⑵ 참여자 자료를 다른 사람이 보는가', seen2 ? 'O 보인다' : '★ 안 보인다');

  // ── ⑶ 권한 밖 자료 — 인도자 등급을 참여자가 연다
  await upload(coach, { title: '[리허설] 인도자 전용', tier: 'coach', file: f });
  await user.goto(`${BASE}/library`, { waitUntil: 'load' }); await settle(user);
  const uText = await user.evaluate(() => document.body.innerText || '');
  const listed = uText.includes('[리허설] 인도자 전용');
  const lockNote = (uText.match(/[^\n]*열립니다[^\n]*/) || [''])[0];
  note('⑶ 권한 밖 자료가 목록에 뜨는가', listed ? `O 뜬다 · 안내 「${lockNote}」` : '★ 감춰진다');
  const { rows: [locked] } = await db.query(`select id from public.library_items where title=$1`, ['[리허설] 인도자 전용']);
  const gate = await user.evaluate(async (id) => {
    const r = await fetch(`/library/${id}/file`, { cache: 'no-store' });
    return r.status;
  }, locked.id);
  note('⑶ 권한 밖 자료의 파일 주소를 참여자가 열면', `${gate}`);
  const pageStatus = await user.goto(`${BASE}/library/${locked.id}`, { waitUntil: 'load' });
  await settle(user).catch(() => {});
  const gateBody = (await user.evaluate(() => document.body.innerText || '')).replace(/\s+/g, ' ').slice(0, 60);
  note('⑶ 권한 밖 자료 화면', `${pageStatus?.status()} · 「${gateBody}」`);
  await user.screenshot({ path: `${OUT}/lib-3-gate.png` });

  // ── ⑷ 큰 파일 — 50MB 문안
  const big = join(tmpdir(), 'reh-51mb.bin');
  writeFileSync(big, Buffer.alloc(51 * 1024 * 1024, 7));
  const r4 = await upload(user, { title: '[리허설] 큰 파일', tier: 'forum', file: big });
  note('⑷ 51MB 를 고르면', r4.blocked ? `O 「${r4.msg}」` : '★ 막히지 않았다');
  unlinkSync(big);

  // ── ⑸ 외부 링크 — 안내가 뜨는가
  await user.goto(`${BASE}/library`, { waitUntil: 'load' }); await settle(user);
  await user.getByRole('button', { name: /자료 올리기/ }).click();
  await user.locator('input[name="library-kind"]').nth(1).check();
  await user.waitForTimeout(300);
  const linkNote = (await user.evaluate(() => document.body.innerText || '')).includes('주소로 거는 자료는 그쪽 공유 설정도 함께 확인해 주세요.');
  note('⑸ 주소를 고르면 안내가 뜨는가', linkNote ? 'O 뜬다' : '★ 안 뜬다');
  await user.locator('input[placeholder="https://"]').fill('https://example.com/자료');
  await user.getByLabel('제목').fill('[리허설] 주소로 건 자료');
  await user.locator('select').first().selectOption('forum');
  await user.getByRole('button', { name: /^올리기$/ }).click();
  await user.waitForFunction(() => (document.body.innerText || '').includes('[리허설] 주소로 건 자료'), null, { timeout: 30000 }).catch(() => {});
  note('⑸ 주소 자료가 목록에 서는가', (await user.evaluate(() => document.body.innerText || '')).includes('[리허설] 주소로 건 자료') ? 'O 선다' : '★ 안 선다');

  // ── ⑹ 본인이 가린다 → 목록에서 어떻게 보이는가
  const { rows: [mine] } = await db.query(`select id from public.library_items where title=$1`, ['[리허설] 참여자가 올린 자료']);
  await db.query(`update public.library_items set hidden_at = now() where id=$1`, [mine.id]);
  await user.goto(`${BASE}/library`, { waitUntil: 'load' }); await settle(user);
  const mineText = await user.evaluate(() => document.body.innerText || '');
  note('⑹ 가린 자료가 본인 목록에', mineText.includes('[리허설] 참여자가 올린 자료') ? `O 보인다 · 표시 「${(mineText.match(/가림/) || ['(표시 없음)'])[0]}」` : '★ 안 보인다');
  await coach.goto(`${BASE}/library`, { waitUntil: 'load' }); await settle(coach);
  const coachSees = (await coach.evaluate(() => document.body.innerText || '')).includes('[리허설] 참여자가 올린 자료');
  note('⑹ 가린 자료를 다른 사람이', coachSees ? '★ 본다' : 'O 못 본다');

  // ── ★ 주소 누출 실물 시험 — 관문을 지난 사람의 주소를 다른 계정에 넣는다
  const { rows: [ok] } = await db.query(`select id from public.library_items where title=$1`, ['[리허설] 1회차 배포 자료']);
  const anon = await browser.newContext();
  const ap = await anon.newPage();
  const r = await ap.request.get(`${BASE}/library/${ok.id}/file`);
  note('★ 로그아웃 상태로 그 주소를 열면', `${r.status()}`);
  const r2 = await ap.request.get(`${BASE}/library/${locked.id}/file`);
  note('★ 로그아웃 상태로 인도자 전용 주소를 열면', `${r2.status()}`);
  await anon.close();
  unlinkSync(f);
} finally {
  // ── 뒤처리
  const { rows } = await db.query(`select id, storage_path from public.library_items where title like '[리허설]%'`);
  for (const r of rows) {
    if (r.storage_path) await admin.storage.from('library').remove([r.storage_path]).catch(() => {});
    await db.query('delete from public.library_items where id=$1', [r.id]).catch(() => {});
  }
  const { rows: [left] } = await db.query('select count(*)::int n from public.library_items').catch(() => ({ rows: [{ n: '?' }] }));
  const { rows: [obj] } = await db.query(`select count(*)::int n from storage.objects where bucket_id='library'`).catch(() => ({ rows: [{ n: '?' }] }));
  console.log(`\n뒤처리 — 지운 자료 ${rows.length}개 · 남은 library_items ${left.n} · storage ${obj.n}`);
  writeFileSync(`${OUT}/library-walk.json`, JSON.stringify(found, null, 2), 'utf8');
  await browser.close();
  await db.end().catch(() => {});
}
