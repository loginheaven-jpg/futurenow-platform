// 5→6회차 실브라우저 회귀. 실제 카드를 쓰며 서버 액션만 브라우저 저장소로 대체한다.
// 운영 DB/권한 검증은 하지 않는다. node scripts/checkinSignals.mjs
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer, transformWithOxc } from 'vite';
import { chromium } from 'playwright';

const root = process.cwd();
const virtual = '\0checkin-signals:';
const mocks = {
  navigation: 'export const useRouter = () => ({refresh(){},push(){}});',
  link: 'export default function Link({href,children,...props}) { return <a href={href} {...props}>{children}</a> }',
  photos: 'export function WorkbookPhotos(){return null}',
  actions: `
    export async function markCheckinOpenedAction() {}
    export async function saveCheckinAction(cohortId, n, answers, flags) {
      localStorage.setItem('signals-' + n, JSON.stringify({ answers, flags }));
      return { ok: true };
    }
    export const submitCheckinAction = saveCheckinAction;
  `,
  main: `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { CheckinCardClient } from '@/app/(member)/my/cohorts/[cohortId]/checkin/[session]/CheckinCardClient';
    import '@/core/ui/ui.css';
    const params = new URLSearchParams(location.search);
    const n = Number(params.get('session') || 5);
    const stored = JSON.parse(localStorage.getItem('signals-' + n) || '{}');
    const prior = JSON.parse(localStorage.getItem('signals-5') || '{}');
    const flags = stored.flags || {suggestionAnon:false,contactRequest:false,deepOpened:false,stepPrivate:false};
    createRoot(document.getElementById('root')).render(<main style={{maxWidth:560,margin:'0 auto',padding:16}}>
      <CheckinCardClient cohortId="signal-test" userId="signal-test" sessionNo={n}
        initialAnswers={stored.answers || {}} initialFlags={flags} alreadyOpened
        hasContent={!!stored.answers} closed={false} priors={n === 6 ? {1:prior.answers || {}} : {}}
        initialMode={params.get('read') ? 'read' : 'edit'} photos={[]} photoCoachView />
    </main>);
  `,
};
const css = (await readFile('src/app/globals.css', 'utf8')).replace(/^@import.*$/gm, '');
const server = await createServer({
  configFile: false, root, server: { host: '127.0.0.1', port: 0 },
  resolve: { alias: { '@': resolve(root, 'src') } },
  optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'], exclude: ['next/link', 'next/navigation'] },
  oxc: { jsx: { runtime: 'automatic' } },
  plugins: [{
    name: 'checkin-signal-fixture',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === '/signal-main.tsx') return virtual + 'main';
      if (source === 'next/navigation') return virtual + 'navigation';
      if (source === 'next/link') return virtual + 'link';
      if (source === './actions' && importer?.includes('CheckinCardClient')) return virtual + 'actions';
      if (source === './WorkbookPhotos' && importer?.includes('CheckinCardClient')) return virtual + 'photos';
    },
    async load(id) {
      if (!id.startsWith(virtual)) return;
      const result = await transformWithOxc(mocks[id.slice(virtual.length)], 'fixture.tsx', { lang: 'tsx', jsx: { runtime: 'automatic' } });
      return result.code;
    },
    configureServer(vite) {
      vite.middlewares.use((req, res, next) => {
        if (req.url.split('?')[0] !== '/') return next();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(`<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script type="module" src="/signal-main.tsx"></script></html>`);
      });
    },
  }],
});
let browser;
try {
  await server.listen();
  const base = server.resolvedUrls.local[0];
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', (error) => { errors.push(error.message); console.error(error.message); });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('#fld-trigger_if input').fill('저녁 설거지를 끝내면');
  await page.locator('#fld-trigger_then input').fill('책을 한 문단 읽는다');
  await page.getByRole('button', { name: '+ 신호와 행동 추가하기', exact: true }).click();
  await page.locator('#fld-trigger_if_2 input').fill('점심을 먹고 돌아오면');
  await page.locator('#fld-trigger_then_2 input').fill('계단을 한 층 오른다');
  await page.getByRole('radio', { name: '먼저 해볼 한 가지' }).nth(1).check();
  await page.locator('#fld-env_change textarea').fill('책을 책상 위에 둔다');
  await page.getByRole('checkbox', { name: '의욕', exact: true }).click();
  await page.getByRole('checkbox', { name: '했습니다', exact: true }).click();
  await page.locator('#fld-self_note textarea').fill('한 번 해보자');
  await page.getByRole('slider').fill('7');
  assert.equal(await page.locator('#fld-step_what').count(), 0);
  assert.equal(await page.getByText(/의지가 아니라 환경 때문이었구나/).count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await mkdir('.qa', { recursive: true });
  await page.screenshot({ path: '.qa/session5-mobile.png', fullPage: true });
  await page.getByRole('button', { name: '갈무리 저장', exact: true }).click();
  await page.getByText('갈무리를 저장했습니다.', { exact: true }).waitFor();
  const saved5 = await page.evaluate(() => JSON.parse(localStorage.getItem('signals-5')).answers);
  assert.equal(saved5.trigger_focus, 1);
  assert.equal(saved5.trigger_then_2, '계단을 한 층 오른다');
  assert.equal(saved5.step_what, undefined);
  console.log('PASS 5회차: 복수 입력 → 선택 → 제출 → 저장 봉투, 모바일 가로 넘침 없음');

  await page.goto(base + '?session=5');
  assert.equal(await page.locator('#fld-trigger_then_2 input').inputValue(), saved5.trigger_then_2);
  assert.equal(await page.getByRole('radio', { name: '먼저 해볼 한 가지' }).nth(1).isChecked(), true);
  await page.getByRole('button', { name: '신호 1 삭제', exact: true }).click();
  assert.equal(await page.locator('#fld-trigger_then input').inputValue(), saved5.trigger_then_2);
  assert.equal(await page.locator('#fld-trigger_then_2').count(), 0);
  // 삭제는 화면에서 검증했다. 6회차에는 제출된 두 쌍을 사용한다.
  await page.evaluate((a) => localStorage.setItem('signals-5', JSON.stringify({ answers: a })), saved5);

  await page.goto(base + '?session=6');
  const select = page.getByRole('combobox', { name: '경험을 돌아볼 신호와 행동' });
  assert.equal(await select.inputValue(), '1');
  assert.equal(await select.locator('option').count(), 2);
  await page.getByRole('checkbox', { name: '그 상황이 와서 행동을 해봤어요', exact: true }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('signals-6') || '{}').answers?.review_trigger_if === '점심을 먹고 돌아오면');
  await select.selectOption('0');
  assert.equal(await page.getByRole('checkbox', { name: '그 상황이 와서 행동을 해봤어요', exact: true }).getAttribute('aria-checked'), 'false');
  await page.getByRole('checkbox', { name: '아직 그 상황이 오지 않았어요', exact: true }).click();
  await page.getByRole('textbox', { name: 'trigger_experience_note', exact: true }).fill('이번 주에는 그 상황이 없었다');
  await page.locator('#fld-carry_today input, #fld-carry_today textarea').fill('함께하는 시간');
  await page.locator('#fld-hope_statement textarea').fill('함께하는 사람으로 살기');
  await page.getByRole('checkbox', { name: '기대감', exact: true }).click();
  await page.getByRole('textbox', { name: 'step_what', exact: true }).fill('매주 안부 묻기');
  await page.locator('#fld-step_when input').fill('일요일 저녁');
  await page.locator('#fld-self_note textarea').fill('함께 걸어왔다');
  await page.getByRole('slider').fill('7');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: '.qa/session6-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: '.qa/session6-desktop.png', fullPage: true });
  await page.getByRole('button', { name: '갈무리 저장', exact: true }).click();
  await page.getByText('갈무리를 저장했습니다.', { exact: true }).waitFor();
  const saved6 = await page.evaluate(() => JSON.parse(localStorage.getItem('signals-6')).answers);
  assert.equal(saved6.review_trigger_if, saved5.trigger_if);
  assert.equal(saved6.review_trigger_then, saved5.trigger_then);
  assert.equal(saved6.trigger_experience, '아직 그 상황이 오지 않았어요');
  assert.equal(saved6.step_what, '매주 안부 묻기');
  console.log('PASS 6회차: 5회차 선택 기본값 → 다른 신호 선택 → 경험과 원문 함께 제출, 90일 실천 유지');

  await page.goto(base + '?session=6&read=1');
  await page.getByRole('button', { name: /적으신 것/ }).click();
  await page.getByText(saved6.trigger_experience, { exact: true }).waitFor();
  assert.equal(await page.getByText(saved6.review_trigger_if, { exact: true }).count(), 1);
  await page.evaluate(() => localStorage.removeItem('signals-5'));
  await page.goto(base + '?session=6');
  assert.equal(await page.getByRole('textbox', { name: '만약', exact: true }).inputValue(), saved6.review_trigger_if);
  console.log('PASS 재열람: 경험·선택한 신호 보존, 이전 기록이 없어져도 저장한 맥락 유지');
  assert.deepEqual(errors, []);
  console.log('PASS 브라우저 예외 0 (서버 액션은 테스트 저장소로 대체, 운영 DB 쓰기 0)');
} finally {
  await browser?.close();
  await server.close();
}
