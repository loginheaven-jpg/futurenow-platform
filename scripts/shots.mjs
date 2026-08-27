// 부품 4폭 스냅숏 하네스 (4차 F-1 · 발주 §6 "4폭 캡처").
//
// **왜 서버가 아니라 정적 HTML 인가.** `/preview/site` 는 게이트 뒤라 세션이 필요하고, 세션 자격이
//   없다(1~3차 내내 같은 제약 · QA 계정 대기). 그래서 **같은 부품·같은 표시 데이터**를
//   `renderToStaticMarkup` 으로 그려 실제 `globals.css`·`ui.css`·`site.css` 를 얹는다.
//   보이는 것은 전시 화면과 같고, 다른 것은 상호작용뿐이다(그것은 sheetKeys 테스트가 전수한다).
//
// 폭은 4차 개요 §2 의 넷 — 1280 · 1024 · 768 · 390.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const OUT = process.argv[2];
if (!OUT) { console.error('사용법: node scripts/shots.mjs <출력 디렉터리>'); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const css = ['src/app/globals.css', 'src/core/ui/ui.css', 'src/app/_screens/site/site.css']
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

// SSR 마크업은 vitest 로 뽑는다 — 프로젝트의 tsx/별칭 해석을 그대로 쓰기 위해서다.
execSync('npx vitest run tests/site.snapshot.test.tsx', { stdio: 'ignore', env: { ...process.env, SHOT_DIR: OUT } });
const wrap = (b) => `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<style>${css}</style><style>body{margin:0}img{max-width:100%}</style>
</head><body>${b}</body></html>`;

const BACKSLASH = String.fromCharCode(92); // 리터럴로 적으면 이 파일을 스크립트로 고칠 때 이스케이프가 어긋난다

const shot = (file, w, out, full) => {
  const url = `file:///${`${OUT}/${file}`.split(BACKSLASH).join('/')}`;
  const page = full ? '--full-page ' : ''; // 시트는 position:fixed 라 전체높이 캡처가 뜻이 없다
  execSync(`npx playwright screenshot ${page}--viewport-size=${w},900 "${url}" "${out}"`, { stdio: 'ignore' });
  console.log(`  ${out}`);
};

writeFileSync(`${OUT}/gallery.html`, wrap(readFileSync(`${OUT}/body.html`, 'utf8')), 'utf8');
writeFileSync(`${OUT}/sheet.html`, wrap(readFileSync(`${OUT}/body-sheet.html`, 'utf8')), 'utf8');

// 전시 — 4폭 전체(개요 §2)
for (const w of [1280, 1024, 768, 390]) shot('gallery.html', w, `${OUT}/site-${w}.png`, true);
// 시트 — position:fixed 라 뷰포트 한 화면으로 찍는다. md↓ 가 햄버거 경로라 390 을 본다.
shot('sheet.html', 390, `${OUT}/sheet-390.png`, false);
shot('sheet.html', 1280, `${OUT}/sheet-1280.png`, false);
console.log('캡처 완료');
