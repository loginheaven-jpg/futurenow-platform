// 카드뉴스 13장 렌더 — **`docs/tasks/render_cards.py` 의 규칙을 그대로 옮긴 Node 판**.
//
// **왜 옮기나**: 이 기계에 파이썬 `playwright` 가 없다(실측). 원본 스크립트는 남겨 두고
//   **같은 규칙**으로 도는 Node 판을 둔다 — 규칙을 바꾸면 카드가 달라지므로 **한 줄도 새로 짓지 않았다**:
//     · 배율(`--scale`)을 1로 되돌리고 검토용 껍데기(머리말·조작부·범례·이름표)를 숨긴다
//     · 검토용 테두리·그림자·둥글기를 없앤다(배포물에는 없어야 한다)
//     · **2배로 그린 뒤 절반으로 줄인다**(골드 세선과 격자가 계단지지 않게)
//     · `document.fonts.ready` 를 기다린다(폰트 전에 찍으면 자간이 어긋난다)
//     · **넘침 재검사** — 잘린 채로 배포되지 않게 마지막 방어선
//
// **원본은 건드리지 않는다** — 시안 HTML 을 읽기만 한다.
//
// 실행: node scripts/renderCards.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
import { readdirSync, statSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DIR = 'docs/tasks';
const OUT = `${DIR}/cards`;
const CARD = 1080;
const SUPERSAMPLE = 2;

/** 시안 파일 — 이름을 못 박지 않고 **가장 최근 판본**을 고른다(원본 스크립트와 같은 규칙). */
const src = readdirSync(DIR)
  .filter((f) => f.startsWith('예봄2기_카드뉴스_시안') && f.endsWith('.html'))
  .map((f) => ({ f: `${DIR}/${f}`, t: statSync(`${DIR}/${f}`).mtimeMs }))
  .sort((a, b) => b.t - a.t)[0];
if (!src) throw new Error('시안 파일이 없다');
console.log(`시안: ${src.f}`);

const PREPARE = () => {
  document.documentElement.style.setProperty('--scale', '1');
  document.body.style.background = '#ffffff';
  document.body.style.padding = '0';
  ['.sheet-head', '.controls', '.legend', '.slot-cap'].forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => { el.style.display = 'none'; });
  });
  document.querySelectorAll('.frame').forEach((el) => {
    el.style.boxShadow = 'none'; el.style.borderRadius = '0'; el.style.outline = 'none';
  });
  document.querySelectorAll('.slot').forEach((el) => el.classList.remove('over'));
  const deck = document.querySelector('.deck');
  if (deck) deck.style.gap = '0px';
};

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: CARD + 80, height: CARD + 80 },
  deviceScaleFactor: SUPERSAMPLE,
});
await page.goto(pathToFileURL(src.f).href, { waitUntil: 'load' });
await page.waitForLoadState('networkidle').catch(() => {});
await page.evaluate(() => document.fonts.ready);
await page.evaluate(PREPARE);
await page.waitForTimeout(600); // 웹폰트 적용 안정화

const cards = await page.$$('.card');
if (cards.length !== 13) console.error(`[경고] 카드 수가 13이 아니다: ${cards.length}장`);

// **넘침 재검사** — 배포 직전 마지막 방어선. 잘린 채로 나가지 않게.
const overflow = await page.evaluate(() => {
  const bad = [];
  document.querySelectorAll('.card').forEach((c, i) => {
    if (c.scrollHeight > c.clientHeight + 1) bad.push(i + 1);
  });
  return bad;
});
if (overflow.length) {
  console.error(`[경고] 내용이 넘치는 카드: ${overflow.join(', ')}`);
  console.error('       원고를 줄이고 다시 돌려라. 잘린 채로 배포된다.');
}

for (let i = 0; i < cards.length; i++) {
  const path = `${OUT}/card_${String(i + 1).padStart(2, '0')}.png`;
  await cards[i].screenshot({ path, scale: 'device' });
  // 2배로 찍었으므로 절반으로 줄인다
  const buf = await sharp(path).resize(CARD, CARD, { kernel: 'lanczos3' }).png().toBuffer();
  await sharp(buf).toFile(path);
  console.log(`  card_${String(i + 1).padStart(2, '0')}.png`);
}
await browser.close();
console.log(`\n산출: ${OUT} · ${cards.length}장 · ${CARD}×${CARD}`);
if (overflow.length) process.exit(1);
