// 서가 목록 사진 관측 — **썸네일을 다시 볼 시점을 알기 위한 자**(지휘부 감리 2026-08-29 ③).
//
// **썸네일은 지금 짓지 않는다** — 재려면 자료가 있어야 하는데 그 값이 지금 없다.
//   대신 **늘어나는 것이 보이면** 그때 다시 본다. 이 도구가 그 눈이다.
//
// **겨냥하는 자리 둘**(지휘부가 미리 적었다):
//   ⑴ 스크롤이 길어지면 `lazy` 라도 **끝까지 내리면 다 받는다** — 원본 5MB 여럿이면 폰에서 무겁다.
//      → 재는 것: **한 화면에 그려지는 사진 수** · **끝까지 내렸을 때 받은 바이트 총량**.
//   ⑵ 프록시는 **우리 함수가 바이트를 나른다** — 동시 요청이 늘면 함수 시간이 든다.
//      → 재는 것: **프록시 호출 수** · **가장 느린 응답**.
//
// **자를 물려 봤다** — 사진 셋을 심고 돌리니 **바이트와 시간이 0** 이었다.
//   프록시는 바이트를 흘리므로 `content-length` 가 **없고**, 타이밍은 요청이 끝나야 읽힌다.
//   **자가 절반만 잰 채로 초록이었다.** 그래서 몸통을 직접 재고 응답을 기다린다.
//
// **판정하지 않는다.** 값을 적고, 눈금을 넘으면 **시끄럽게** 말한다. 무엇을 할지는 사람이 정한다.
//
// 사용: node scripts/observeLibraryPhotos.mjs [--base=https://…]
import { writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = (process.argv.find((a) => a.startsWith('--base=')) ?? '').split('=')[1] ?? 'https://future.yebom.org';
const OUT = 'docs/shots';
mkdirSync(OUT, { recursive: true });

/** 눈금 — **넘으면 썸네일을 다시 본다.** 지금 값이 아니라 «다시 볼 시점» 이다. */
const WATCH = {
  photosOnScreen: 6,
  totalBytes: 15 * 1024 * 1024,
  slowestMs: 3000,
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

const calls = [];
const pending = [];
page.on('response', (r) => {
  if (!/\/library\/[0-9a-f-]{36}\/file/.test(r.url())) return;
  pending.push((async () => {
    let bytes = 0;
    try { bytes = (await r.body()).length; } catch { bytes = 0; }
    const t = r.request().timing();
    const ms = t.responseEnd > 0 ? Math.round(t.responseEnd) : 0;
    calls.push({ status: r.status(), bytes, ms });
  })());
});

await page.goto(`${BASE}/library`, { waitUntil: 'load', timeout: 30000 });
await page.waitForFunction(() => !((document.body.innerText || '').includes('불러오는 중')), null, { timeout: 20000 }).catch(() => {});

const onScreen = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')].filter((i) => /\/library\/[0-9a-f-]{36}\/file/.test(i.src));
  const vh = window.innerHeight;
  return {
    total: imgs.length,
    visible: imgs.filter((i) => { const r = i.getBoundingClientRect(); return r.top < vh && r.bottom > 0; }).length,
  };
});
// **첫 화면 몫이 들어오기를 기다린다** — `lazy` 는 뷰포트에 들어와야 요청하므로
//   재는 시점이 요청보다 빠르면 **0 이 나오고 그것은 «없다» 가 아니라 «아직» 이다**(물려 보니 0 이었다).
//   조건으로 끝나고 상한이 있다(승격 2026-08-28).
await page.waitForFunction(
  () => [...document.querySelectorAll('img')]
    .filter((i) => i.src.includes('/file'))          // 정규식을 쓰지 않는다 — 이스케이프가 깨지면 자가 헛돈다
    .every((i) => i.complete),
  null, { timeout: 15000 },
).catch(() => {});
await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
await Promise.all(pending.slice());
const firstScreenCalls = calls.length;

// **끝까지 내린다** — lazy 라도 끝까지 내리면 다 받는다는 그 자리.
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
  window.scrollTo(0, document.body.scrollHeight);
});
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await Promise.all(pending);

const totalBytes = calls.reduce((a, c) => a + c.bytes, 0);
const slowest = calls.reduce((a, c) => Math.max(a, c.ms), 0);

const report = {
  잰때: new Date().toISOString(),
  대상: BASE,
  목록의_사진_수: onScreen.total,
  첫화면에_보인_사진: onScreen.visible,
  첫화면_프록시_호출: firstScreenCalls,
  끝까지_내린_뒤_프록시_호출: calls.length,
  받은_바이트_총량: totalBytes,
  가장_느린_응답ms: slowest,
  눈금: WATCH,
};
console.log(JSON.stringify(report, null, 2).replace(/"/g, ''));

const 넘은것 = [];
if (onScreen.visible > WATCH.photosOnScreen) 넘은것.push(`첫 화면 사진 ${onScreen.visible} > ${WATCH.photosOnScreen}`);
if (totalBytes > WATCH.totalBytes) 넘은것.push(`받은 바이트 ${totalBytes} > ${WATCH.totalBytes}`);
if (slowest > WATCH.slowestMs) 넘은것.push(`가장 느린 응답 ${slowest}ms > ${WATCH.slowestMs}ms`);

writeFileSync(`${OUT}/library-photo-observe.json`, JSON.stringify({ ...report, 넘은것 }, null, 2), 'utf8');
await browser.close();

if (넘은것.length) {
  console.error(`\n★ 눈금을 넘었다 — 썸네일을 다시 볼 때다:\n  · ${넘은것.join('\n  · ')}`);
  process.exit(1);
}
console.log('\nO 눈금 안이다 — 썸네일은 아직 짓지 않는다.');
