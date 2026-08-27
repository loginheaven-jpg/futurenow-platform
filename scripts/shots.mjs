// 4폭 캡처 하네스 — **전 화면 하나로** (4차 F-1 신설 · F-5 준비에서 통합).
//
// 폭은 개요 §2 의 넷(1280·1024·768·390)이고 `screens.mjs` 가 화면 목록의 **단일 출처**다.
//
// 모드 셋:
//   `public`  — 비인증 실라우트. **서버를 띄워 진짜 화면을 찍는다.** 오늘 바로 된다
//   `fixture` — 인증 뒤 화면의 **표시 층을 SSR 로** 그려 찍는다. QA 계정 전의 대역
//   `auth`    — 인증 뒤 **실라우트**. QA 계정이 와야 한다(↓ 주)
//
// **`fixture` 를 "브라우저에서 확인했다"로 적지 않는다.** 같은 부품·같은 조립을 실제 CSS 로
//   그린 것이고 다른 것은 상호작용뿐이다(그것은 `sheetKeys` 등 단위테스트가 전수한다).
//
// **`auth` 는 아직 구현하지 않았다.** `npx playwright screenshot` CLI 는 로그인을 못 한다 —
//   세션이 필요하다. 두 길이 있고 **어느 쪽이든 지휘부 판단 사항**이라 임의로 고르지 않았다:
//     ① `playwright` 를 devDependency 로 들여 프로그램으로 로그인 → 캡처 (의존성 +1)
//     ② `@supabase/supabase-js`(이미 있다)로 로그인해 세션 쿠키를 만들고
//        `--load-storage` 로 넘긴다 (의존성 0 · 쿠키 형식을 실측해야 한다)
//   자세한 것은 F-5 준비 보고 §3.
//
// 사용:
//   node scripts/shots.mjs public  <출력>            # 서버가 이미 떠 있어야 한다(기본 3100)
//   node scripts/shots.mjs fixture <출력>
//   node scripts/shots.mjs all     <출력>            # public + fixture
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { WIDTHS, PUBLIC_SCREENS, FIXTURE_FILES } from './screens.mjs';

const MODE = process.argv[2];
const OUT = process.argv[3];
const BASE = process.env.SHOT_BASE ?? 'http://localhost:3100';
/** 하이드레이션·데이터 대기(ms). 느린 화면이 있으면 `SHOT_WAIT` 로 올린다. */
const WAIT = Number(process.env.SHOT_WAIT ?? 2500);

if (!['public', 'fixture', 'all'].includes(MODE) || !OUT) {
  console.error('사용법: node scripts/shots.mjs <public|fixture|all> <출력 디렉터리>');
  process.exit(2);
}

const BACKSLASH = String.fromCharCode(92); // 리터럴로 적으면 이 파일을 스크립트로 고칠 때 이스케이프가 어긋난다
const dir = (g) => `${OUT}/${g}`;
mkdirSync(OUT, { recursive: true });

/**
 * 한 장. `full` 이면 전체 높이, 아니면 뷰포트 한 화면(position:fixed 는 전체높이가 뜻이 없다).
 *
 * **`--wait-for-timeout` 이 없으면 클라이언트 화면이 로딩 셸로 찍힌다.**
 *   `/library`·`/join` 같은 화면은 서버가 `불러오는 중…` 을 먼저 내려보내고 하이드레이션 뒤에
 *   본문을 그린다. 기다리지 않으면 **빈 껍데기가 조용히 저장되고**, 사람이 볼 때는
 *   "화면이 비었다"로 읽힌다 — 실제로는 캡처가 이른 것이다.
 *   (F-5 준비 중 `/library` 실측으로 잡았다. 2차 §9.6 위양성과 같은 계열 — **내가 본 시점**의 문제다.)
 */
function shot(url, w, out, full) {
  const page = full ? '--full-page ' : '';
  execSync(
    `npx playwright screenshot ${page}--wait-for-timeout=${WAIT} --viewport-size=${w},900 "${url}" "${out}"`,
    { stdio: 'ignore' },
  );
}

// ── public — 비인증 실라우트 ─────────────────────────────────────────────
function capturePublic() {
  mkdirSync(dir('public'), { recursive: true });
  // 서버가 살아 있는지 먼저 본다 — 죽은 서버에 대고 찍으면 **빈 페이지가 조용히 저장된다.**
  try {
    execSync(`curl -sf -o /dev/null "${BASE}/"`, { stdio: 'ignore' });
  } catch {
    console.error(`서버가 없다: ${BASE}\n  먼저 \`npx next build && npx next start -p 3100\` 을 띄운다.`);
    process.exit(3);
  }
  console.log(`\n[public] 비인증 실라우트 — ${PUBLIC_SCREENS.length}화면 × ${WIDTHS.length}폭`);
  for (const s of PUBLIC_SCREENS) {
    for (const w of WIDTHS) shot(`${BASE}${s.path}`, w, `${dir('public')}/${s.name}-${w}.png`, true);
    console.log(`  ${s.name.padEnd(10)} ${s.path.padEnd(12)} ${s.note}`);
  }
}

// ── fixture — 인증 뒤 화면의 표시 층 ─────────────────────────────────────
function captureFixture() {
  const raw = `${OUT}/_fixture`;
  mkdirSync(raw, { recursive: true });
  mkdirSync(dir('auth-fixture'), { recursive: true });

  // SSR 마크업은 vitest 로 뽑는다 — 프로젝트의 tsx/별칭 해석을 그대로 쓰기 위해서다.
  execSync('npx vitest run tests/site.snapshot.test.tsx', { stdio: 'ignore', env: { ...process.env, SHOT_DIR: raw } });

  const css = ['src/app/globals.css', 'src/core/ui/ui.css', 'src/app/_screens/site/site.css']
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');
  const wrap = (b) => `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<style>${css}</style><style>body{margin:0}img{max-width:100%}</style>
</head><body>${b}</body></html>`;

  console.log(`\n[auth-fixture] 표시 층 SSR — ${Object.keys(FIXTURE_FILES).length}화면 (QA 계정 대역)`);
  for (const [name, f] of Object.entries(FIXTURE_FILES)) {
    const page = `${raw}/${name}-page.html`;
    writeFileSync(page, wrap(readFileSync(`${raw}/${f.body}`, 'utf8')), 'utf8');
    const url = `file:///${page.split(BACKSLASH).join('/')}`;
    // 전체 높이가 뜻이 없는 것(시트 = position:fixed)은 390 한 폭만 찍는다.
    const widths = f.full ? WIDTHS : [390];
    for (const w of widths) shot(url, w, `${dir('auth-fixture')}/${name}-${w}.png`, f.full);
    console.log(`  ${name.padEnd(14)} ${widths.join('·')}`);
  }
}

if (MODE === 'public' || MODE === 'all') capturePublic();
if (MODE === 'fixture' || MODE === 'all') captureFixture();

console.log(`\n산출: ${OUT}/`);
console.log('  public/       — 비인증 실라우트(진짜 화면)');
console.log('  auth-fixture/ — 인증 뒤 화면의 표시 층(QA 계정 오면 실라우트로 대체)');
