// 인증된 상태에서 착지 화면의 **문서 응답 시간**을 잰다. 고치기 전/뒤 대조용.
//   캐시가 끼지 않게 매번 새 요청이고, 중앙값을 쓴다(한 번은 흔들림과 구별되지 않는다).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const t = readFileSync('.env.local', 'utf8');
const g = (k) => ((t.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1] || '').trim();
const B = 'https://future.yebom.org';
const N = 7;
const b = await chromium.launch();
const page = await (await b.newContext()).newPage();
await page.goto(B + '/login', { waitUntil: 'load' });
await page.getByLabel(/이메일/).fill(g('QA_USER_EMAIL'));
await page.getByLabel(/비밀번호/).fill(g('QA_USER_PASSWORD'));
await page.getByRole('button', { name: /로그인/ }).click();
await page.waitForFunction(() => !location.pathname.startsWith('/login'), null, { timeout: 30000 });

const med = (xs) => xs.slice().sort((a, c) => a - c)[Math.floor(xs.length / 2)];
for (const path of ['/home', '/home/assessments', '/my/values', '/feed']) {
  const xs = [];
  for (let i = 0; i < N; i++) {
    const r = await page.evaluate(async (p) => {
      const t0 = performance.now();
      const res = await fetch(p + '?_t=' + Math.random(), { cache: 'no-store' });
      await res.text();
      return performance.now() - t0;
    }, path);
    xs.push(Math.round(r));
  }
  console.log(`  ${path.padEnd(20)} 중앙 ${String(med(xs)).padStart(4)}ms   ${xs.join(' ')}`);
}
await b.close();
