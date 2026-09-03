// 4폭 캡처 하네스 — **전 화면 하나로** (4차 F-1 신설 · F-5 준비에서 통합).
//
// 폭은 개요 §2 의 넷(1280·1024·768·390)이고 `screens.mjs` 가 화면 목록의 **단일 출처**다.
//
// 모드 넷:
//   `public`  — 비인증 실라우트. 서버를 띄워 진짜 화면을 찍는다
//   `fixture` — 인증 뒤 화면의 **표시 층을 SSR 로** 그려 찍는다(QA 계정 전의 대역)
//   `auth`    — 인증 뒤 **실라우트**. `.env.local` 의 QA 자격으로 로그인해 찍는다
//   `preflight` — **이 주소를 절차서에 적어도 되는가**를 먼저 잰다(↓)
//   `all`     — public + fixture
//
// **`fixture` 를 "브라우저에서 확인했다"로 적지 않는다.** 같은 부품·같은 조립을 실제 CSS 로
//   그린 것이고 다른 것은 상호작용뿐이다(그것은 `sheetKeys` 등 단위테스트가 전수한다).
//
// **`playwright` 는 devDependency 다**(버전 고정 · 지휘부 승인 2026-08-28).
//   런타임 코드가 이것을 수입하지 않음을 `tests/devDeps.guard.test.ts` 가 잠근다.
//   쿠키를 손으로 합성하는 길을 택하지 않은 이유: **Supabase 쿠키 형식에 결합된 자가제작 우회라
//   형식이 바뀌면 조용히 깨진다** — 이 하네스가 방금 겪은 함정을 다시 심는 일이다.
//
// ─────────────────────────────────────────────────────────────────────────────
// **규율: 기다림에는 끝이 있어야 하고, 끝났는지 확인할 수 있어야 한다.**
//   (지휘부 승격 2026-08-28 · `CLAUDE.md` §11)
//
//   고정 대기(`setTimeout`)를 쓰지 않는다 — *"2.5초면 되겠지"* 는 추측이고 느린 화면에서
//   여전히 로딩 셸을 찍는다. 그렇다고 **상한 없이 기다리면 멈춘다.** 둘 다 겪었다.
//   지금은 **로드 상태**를 기다리되 **모든 대기에 상한**이 있고, 넘기면 **시끄럽게 실패**한다.
//
// **이 스택 고유의 함정 열** — 전부 실측으로 얻었다. 지우지 말 것.
//   ①~⑥ 은 *도구가 잘못 쟀다*, ⑦ 은 *도구가 대상을 지어내고 그것을 쟀다* — **층이 다르다**:
//
//   ① **`networkidle` 은 아예 안 잡힌다.** Next 가 RSC 프리페치로 연결을 계속 여닫는다.
//      주 신호로 삼으면 화면마다 상한을 헛되이 태운다(실측: 44장에 11분을 태우고 미완).
//      → 주 신호는 `load`, `networkidle` 은 **보조**(`IDLE_MS`).
//
//   ② **숨겨진 lazy 이미지는 영영 로드되지 않는다.** `display:none` + `loading="lazy"` 면
//      `img.complete` 가 끝내 `false` 다(`/recruit` 카드가 lg 미만에서 그렇다).
//      → 이미지 대기에 상한(`IMG_MS`). 상한이 없으면 여기서 멈춘다.
//
//   ③ **`position: fixed` + 긴 full-page 캡처는 안 끝날 수 있다.** `/recruit` 이 5,947px 인데
//      하단 고정 바가 있어 캡처가 안정될 때까지 늘어졌다.
//      → 캡처 자체에 상한(`SHOT_MS`) + `animations: 'disabled'`.
//
//   ④(모양은 다르나 뿌리는 같다) **눌러야 보이는 화면**은 URL 이 같아 조용히 다른 것을 찍는다.
//      시트가 `/home` 과 같은 주소라 홈을 두 번 찍고 있었다 → `open` 슬롯 + 실패 기록.
//
//   ⑤ **`page.goBack()` 의 반환값이 거짓을 말한다.** App Router 의 클라이언트 뒤로가기는
//      문서 내비게이션이 아니라서 `null` 이 온다 — **이동은 했는데 "못 갔다"로 읽힌다.**
//      그대로 믿으면 *"뒤로가기는 두 번이면 끝난다"* 는 결론이 나온다(실제로는 넷이다).
//      → 뒤로가기는 **URL 로 판정한다.** 반환값이 아니라 `location` 을 본다.
//      (5차 사전 조사에서 실측 · 지휘부 지시로 이 계열에 편입.)
//
//   ⑥ **되돌리기가 커밋 전 작업을 지운다.** 변이 테스트 하네스가 복원을 `git checkout` 으로 했는데
//      그 편집이 아직 커밋 전이라 **재는 대상 자체가 사라졌다.** 변이 하나가 통과로 나왔고
//      그것은 잠금이 좋아서가 아니라 **원본이 없어서**였다.
//      → 되돌리기는 **백업본 복사**로 한다. 도구가 재는 것을 먼저 재는 일은 **되돌리기에도** 걸린다.
//
//   ⑦ **없는 것을 만들어 놓고 그것을 쟀다.** 마이그레이션이 `feed_post_list` 를 고치고 있었는데
//      **저장소에 그런 함수가 없었다**(진짜 이름은 `feed_list`). `DROP ... IF EXISTS` 가 조용히
//      지나가고 **새 함수가 하나 생겼을 뿐**, 코드가 부르는 함수는 옛 모양으로 남는다.
//      **롤백 검증도 통합테스트도 회귀 잠금도 전부 초록이었다** — 테스트가 **같은 가짜 이름**을
//      불렀기 때문이다. 내가 만든 것을 내가 부르니 통과한다.
//      잡은 것은 테스트가 아니라 **실물 조회**였다(`pg_get_function_result(…)` → `undefined`).
//      → 마이그레이션이 **DB 에 실재하는 함수**를 가리키는지 **양방향**으로 잠근다
//        (있는 이름을 다루는가 · 없는 이름이 남아 있지 않은가).
//
//   ⑧ **변이가 대상에 닿지 않았는데 통과를 잠금의 증거로 읽을 뻔했다.**
//      차단 검증의 변이 하나에서 **부르는 사람만 바꾸고 `feed_can_access` 의 대상 인수는 그대로 뒀다.**
//      바꾼 곳과 재는 곳이 어긋나 **여전히 원래 사람을 재고 있었고**, 결과는 기대와 같았다.
//      그 초록을 *잠금이 무는 증거* 로 읽으면 **변이 테스트 자체가 위증**이 된다 —
//      잠금이 좋아서가 아니라 **변이가 일어나지 않아서** 통과한 것이기 때문이다.
//      → **변이도 측정이므로 같은 규율이 걸린다**(지휘부 판정 2026-08-30).
//        변이를 넣은 뒤 **먼저 변이가 실제로 성립했는지**(재는 값이 움직였는지) 확인하고,
//        그 다음에 잠금이 무는지 본다. **변이 전후가 같으면 그것은 변이가 아니다.**
//
//   ⑨ **판정의 창이 판정 대상과 어긋난다.** 두 방향이 있고 **처방이 같다.**
//
//      **⑨-a 좁다** — 대상의 일부만 본다. **놓친 것을 통과로 읽는다.**
//         `tail -2` 가 `✖ N problems` 요약줄을 잘라 8을 2로 읽었다 ·
//         `Tests` 줄만 보고 **수집 실패 다섯을 초록으로** 읽었다 ·
//         *시끄럽게 출력한다* 가 출력이지 집계가 아니어서 스킵이 통과로 셌다 ·
//         잠금이 **문장의 존재**를 쟀고 사실을 안 쟀다.
//
//      **⑨-b 넓다** — 대상 아닌 것을 함께 본다. **없는 것을 있다고 읽는다.**
//         `<header>` 를 통째로 세어 **본문의 의미 태그**(피드 요약)를 «헤더 두 줄» 로 읽었다.
//
//      **처방이 같아서 한 조항이다** — 창을 대상에 맞춘다. 그러려면
//      **대상이 무엇인지 먼저 말해야 한다.** *헤더* 를 세려다 *header 태그* 를 센 것이 그 자리다.
//      (`header:has(.site-gnb__burger)` 로 좁히자 값이 맞았다.)
//
//      아래는 ⑨-a 가 **세 번** 같은 자리에서 났다는 기록이다:
//      ⑴ *시끄럽게 출력한다* 가 **출력**이지 **집계**가 아니어서 스킵이 통과로 셌다
//      ⑵ 잠금이 **문장의 존재**를 쟀고 **사실**을 안 쟀다(마이그레이션 적용 상태)
//      ⑶ 초록 판정이 `Tests` 줄만 보고 **`Test Files` 줄을 안 봤다** — 수집 실패 다섯이 숨었다
//         (`copyRegression` 58개 포함. 화면은 «1216 통과» 로 초록이었다.)
//      셋 다 **재는 창이 재려는 것보다 좁았다.** 값은 맞았고 창이 작았다.
//      → **세 번 같은 자리에서 났으면 주의가 아니라 형식이다**(지휘부 판정 2026-09-01).
//        `scripts/verify.mjs` 가 네 지표를 통째로 뽑고, `tests/verifyHarness.test.ts` 가
//        **그 도구가 좁아지면 레드를 낸다**(변이 둘로 확인).
//
//   ⑩ **도구를 바꿀 때는 도구부터 대조한다.**
//      `eslint` 경고가 2 → 20 으로 보였다. **같은 명령이었다** — 옛 판독이 `tail -2` 라
//      `✖ N problems` 요약줄을 잘라내고 있었고, 동시에 실제로도 늘어 있었다.
//      **둘 중 어느 쪽인지 말하지 못하면 「좁게 본 것」과 구별되지 않는다.**
//      → 같은 커밋에서 **옛 방식과 새 방식을 나란히** 돌리고, 차이가 **범위인지 실제인지** 가른다.
//      계열 ⑧(재는 것을 먼저 확인)의 **도구 교체판**이다.
//
//   ⑪ **편집한 뒤 바뀐 자리를 값으로 센다 — 코드 밖 편집에도.**
//      한 회차에 편집 도구가 **세 번** 조용히 어긋났다(2026-08-29):
//      `replace` 가 매치되지 않았는데 「갱신」만 찍혔고 · 첫 치환은 실패하고 둘째만 성공해 파일이 깨졌고 ·
//      정규식의 `\/` 가 제어문자로 바뀌었다. **셋 다 「명령은 성공했고 대상이 틀렸다」다.**
//      → **잡은 구조가 하나뿐이었다**(지휘부 판정) — `verify` 가 값을 내고 사람이 읽는 것.
//        **`verify` 는 「코드가 깨졌는가」를 잡지 「의도한 것을 바꿨는가」를 못 잡는다.**
//        **문서·주석·문안 편집은 tsc 도 eslint 도 vitest 도 보지 않는다.**
//        셋째가 정규식이라 코드에 걸렸을 뿐이고, **같은 실패가 마이그레이션 주석이나 ADR 본문에서 나면
//        아무것도 울지 않는다.**
//      → **절차**: 편집 명령마다 **대상 수를 세어 기대와 대조한다.**
//        「고쳤다」가 아니라 `옛 문장 0 곳 / 새 문장 1 곳` 처럼 **숫자로** 확인한다.
//        치환이 여럿이면 **각각** 센다 — 하나가 실패하고 나머지가 성공하면 파일이 어긋난 채 남는다.
//        정규식을 쓸 자리에 **문자열 메서드로 갈 수 있으면 그렇게 한다** — 이스케이프가 깨질 자리를 없앤다.
//      **습관이 아니라 형식이다** — 오늘 세 번이면 다음에도 난다.
//      → ★ **조항 층이 셋으로 갈린다**(지휘부 정리 2026-08-30 · 셋이 겹치지 않는다):
//        · **⑪(이 항목) — 편집한 결과를 값으로 센다.** `verify` 는 「코드가 깨졌는가」를 잡지
//          **「의도한 것을 바꿨는가」를 못 잡는다.** 문서·주석·문안 편집은 tsc·eslint·vitest 가 보지 않는다.
//          그러므로 **편집 명령마다 대상 수를 세어 기대와 대조한다**(`0곳 / 1곳 / 1곳`).
//        · **⑫ — 편집의 전달 경로.** 긴 것을 한 줄에 실어 보내지 않는다.
//        · **⑬ — 잠금 층.** 「있는가」로 묻는 잣대는 의심 대상이다.
//        **⑪ 은 「바꾼 것이 맞나」, ⑫ 는 「가다가 깨지지 않았나」, ⑬ 은 「자가 무나」다.**
//      → **네 번째가 이 조항을 세운 직후에 났다.** 대조 명령 자체가 틀렸다 —
//        `grep -cE '[ㄱ-ㄹ]'` 이 한글 자모 범위를 못 잡아 **0 을 냈는데 실물은 4 였다.**
//        **세는 자가 틀리면 「고쳤다」와 「안 고쳐졌다」를 구별 못 한다.**
//        그러므로 **0 이 나오면 그 자리를 눈으로 한 번 본다** — 계열 ⑦ 과 같은 뿌리다:
//        *0 은 「없다」일 수도 「못 봤다」일 수도 있고, 둘을 가르는 것은 실물을 여는 것뿐이다.*
//        문자 범위(`[가-힣]`·`[ㄱ-ㄹ]`)로 세지 말고 **찾는 문자열을 그대로** 쓴다.
//
//   ⑫ **긴 것을 한 줄에 실어 보내지 않는다 — 파일로 쓰고 파일을 넘긴다.**
//      2026-08-30 에 전달 사고가 **여섯 번** 났고 그중 **셋이 같은 자리**였다:
//      정규식이 제어문자로 바뀜 · `grep` 한글 자모 범위가 안 먹음 · heredoc 이 EOF 를 못 찾음.
//      **셋 다 긴 것을 한 줄에 실어 보낸 자리**다 — 긴 SQL · 긴 정규식 · 긴 패턴.
//      → **전달 경로가 짧을수록 깨질 자리가 적다.** 파일에 쓰고 **경로만** 넘긴다.
//        긴 SQL 은 마이그레이션 파일을 읽어서 그대로 먹이고(사람이 옮겨 적지 않는다),
//        긴 정규식은 **문자열 메서드로 갈 수 있으면 그렇게 간다**(`String.fromCharCode(10)` · `includes`),
//        찾는 것은 **문자 범위(`[가-힣]`)가 아니라 찾는 문자열 그대로** 쓴다.
//      **잦은 것이 맞다** — 다만 **넷째부터는 도구가 잡았고 처음 셋은 사람이 눈으로 잡았다.**
//      그 전환이 일어나고 있다(지휘부 판정 2026-08-30). ⑪ 이 «값으로 센다» 라면 이것은 «짧게 보낸다» 다.
//
//   ⑬ **「있는가」로 묻는 잣대는 전부 의심 대상이다.**
//      **있다는 것은 그것뿐인가를 말하지 않고, 그것이 이기는가를 말하지 않는다.**
//      우리가 이미 겪은 셋이 전부 이 모양이다(지휘부 감리 2026-08-30):
//        · `order by created_at` 이 **포함**돼도 **앞에 다른 키가 있을 수 있다** — 서가 B 정렬 잠금
//        · 게이트 호출이 **포함**돼도 **결과를 무시할 수 있다** — 도구 게이트 · `is_admin` 을 `perform` 만 하기
//        · 문장이 **포함**돼도 **사실이 아닐 수 있다** — `REVOKE` 를 썼는데 걷히지 않은 자리
//      → **처방은 하나다: 절 전체 · 반환값 · 사실 자체로 조인다.**
//        `toContain` 을 쓰기 전에 «그것뿐인가» 로 바꿀 수 있는지 먼저 본다.
//      **그리고 반드시 심어 본다** — 세 번 다 **변이를 심고서야** 알았다.
//
//   ①~⑥ 은 한 모양이다 — *"찍히기는 했는데 다른 것을 찍었다"*.
//   ⑤⑥ 은 카메라가 아니라 **자·되돌리기**가 그랬을 뿐이고, 셋 다 **도구가 잘못 쟀다** 는 층이다.
//   **⑦ 은 층이 다르다**(지휘부 판정 2026-08-29) — **도구가 대상을 지어내고 그것을 쟀다.**
//   앞의 여섯은 자를 고치면 되지만, 이것은 **잰 것이 없었다.**
//   **⑧ 은 또 한 층이다** — 잰 것은 있었으나 **재는 조건을 만들지 못했다.**
//   ⑥ 과 짝이지만 같지 않다: ⑥ 은 **원본이 사라져서**, ⑧ 은 **변이가 대상에 닿지 않아서**다.
//   둘 다 *변이 테스트의 초록* 이라는 같은 얼굴로 나온다.
//
//   **초록은 대상이 실재한다는 증거가 아니다.**
//   **검증 셋이 같은 가정 위에 서면 셋을 다 통과해도 아무것도 증명되지 않는다.**
//   **정본에서 읽지 않고 추측한 이름·시그니처·스키마가 이 사고의 공통 원인이다.**
//   (그 셋이 실제로 한 회차에 함께 나왔다 — 함수명 · 인자 순서 · 픽스처 표.)
//
//   **측정 도구를 먼저 측정한다.** 그리고 **그 도구가 재는 대상이 실재하는지 먼저 묻는다.**
// ─────────────────────────────────────────────────────────────────────────────
//
// 사용:
//   node scripts/shots.mjs public  <출력>     # 서버가 떠 있어야 한다(SHOT_BASE 기본 :3100)
//   node scripts/shots.mjs fixture <출력>
//   node scripts/shots.mjs auth    <출력>     # + .env.local 의 QA_* 자격 · SHOT_COHORT
//   node scripts/shots.mjs all     <출력>
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { WIDTHS, PUBLIC_SCREENS, AUTH_SCREENS, FIXTURE_FILES } from './screens.mjs';

const MODE = process.argv[2];
const OUT = process.argv[3];
const BASE = process.env.SHOT_BASE ?? 'http://localhost:3100';
/** 네트워크 잠잠 **보조** 대기 상한(ms). 주 신호는 `load` 이고 이것은 덤이다. */
const IDLE_MS = Number(process.env.SHOT_IDLE_MS ?? 1200);
/** 이미지 대기 상한(ms). 숨겨진 lazy 이미지는 영영 안 붙으므로 반드시 상한이 있어야 한다. */
const IMG_MS = Number(process.env.SHOT_IMG_MS ?? 1500);
/** 한 장 캡처 상한(ms). **걸리면 조용히 멈추지 말고 시끄럽게 실패한다.** */
const SHOT_MS = Number(process.env.SHOT_TIMEOUT_MS ?? 30_000);

if (MODE === 'preflight') {
  // 출력 디렉터리가 필요 없다 — 찍지 않고 재기만 한다.
} else if (!['public', 'fixture', 'auth', 'all'].includes(MODE) || !OUT) {
  console.error('사용법: node scripts/shots.mjs <public|fixture|auth|preflight|all> <출력 디렉터리>');
  process.exit(2);
}

const dir = (g) => `${OUT}/${g}`;
if (OUT) mkdirSync(OUT, { recursive: true });

/** `.env.local` 을 읽는다. **값을 출력하지 않는다** — 자격은 로그에도 남기지 않는다(발주 §0.3). */
function env() {
  if (!existsSync('.env.local')) return {};
  return Object.fromEntries(
    readFileSync('.env.local', 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  );
}

/**
 * **로드가 끝났는지 기다린다** — 고정 시간이 아니다.
 *
 * `networkidle` 만으로는 모자란 적이 있다(폰트가 늦게 붙어 글자 폭이 바뀐다).
 * 그래서 문서 준비 → 네트워크 잠잠 → 폰트 → 이미지 순으로 확인한다.
 * 그래도 안 끝나면 **조용히 넘어가지 않고** 그 화면 이름과 함께 알린다.
 */
async function settle(page, label) {
  // **주 신호는 `load` 다.** Next 는 RSC 프리페치로 연결을 계속 여닫아
  //   `networkidle` 이 아예 안 잡히는 화면이 있다 — 그것을 주 신호로 삼으면
  //   화면마다 상한만큼 헛되이 기다린다(실측: 44장에 11분을 태웠다).
  await page.waitForLoadState('load');
  // 보조로만 짧게 본다. 못 잡아도 정상이므로 **경고하지 않는다.**
  await page.waitForLoadState('networkidle', { timeout: IDLE_MS }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  // 이미지가 붙어야 레이아웃이 정해진다. **다만 상한을 건다** —
  //   `loading="lazy"` 이면서 `display:none` 인 이미지는 **영영 로드되지 않는다**
  //   (`/recruit` 의 카드가 lg 미만에서 그렇다). 상한이 없으면 여기서 멈춘다.
  await page
    .evaluate(
      (ms) =>
        Promise.race([
          Promise.all(
            [...document.images]
              .filter((i) => !i.complete)
              .map((i) => new Promise((r) => { i.onload = i.onerror = r; })),
          ),
          new Promise((r) => setTimeout(r, ms)),
        ]),
      IMG_MS,
    )
    .catch(() => console.warn(`    ⚠ ${label}: 이미지 대기 실패 — 그대로 찍는다`));
}

async function shot(ctx, url, w, out, full, label, open) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(url, { waitUntil: 'commit' });
  await settle(page, `${label} ${w}px`);
  if (open) {
    // **눌러야 보이는 화면**(시트 등). 못 누르면 조용히 홈을 찍게 되므로 시끄럽게 실패한다.
    try {
      await page.getByRole('button', { name: open }).click({ timeout: 5000 });
      await page.waitForTimeout(300); // 열림 전환
    } catch (err) {
      console.error(`    ✕ ${label} ${w}px: '${open}' 을 누르지 못했다 — ${String(err).split(String.fromCharCode(10))[0]}`);
      FAILED.push(`${label}-${w}(open)`);
    }
  }
  // **가로 넘침 검사** — F-5 게이트의 "깨짐 0" 을 눈이 아니라 수로 잰다.
  //   `body` 가 뷰포트보다 넓으면 가로 스크롤이 생긴다 = 레이아웃이 터진 것이다.
  //   88장을 눈으로만 보는 것은 신뢰할 수 없다 — **사람은 32번째쯤에서 안 본다.**
  const over = await page
    .evaluate(() => {
      const d = document.documentElement;
      return Math.max(d.scrollWidth, document.body.scrollWidth) - d.clientWidth;
    })
    .catch(() => 0);
  if (over > 1) {
    console.error(`    ✕ ${label} ${w}px 가로 넘침 ${over}px`);
    OVERFLOW.push(`${label}-${w}(+${over}px)`);
  }
  try {
    // `animations: 'disabled'` + 상한 — 함정 ③(fixed + 긴 full-page)이 여기서 걸린다.
    await page.screenshot({ path: out, fullPage: full, timeout: SHOT_MS, animations: 'disabled' });
  } catch (err) {
    // **조용히 넘어가지 않는다.** 어느 화면 어느 폭인지 말하고 넘어간다 —
    //   빠진 장이 있다는 사실이 보고서에 남아야 한다.
    console.error(`    ✕ ${label} ${w}px 캡처 실패: ${String(err).split(String.fromCharCode(10))[0]}`);
    FAILED.push(`${label}-${w}`);
  }
  await page.close();
}

/** 실패한 장 목록 — 끝에 모아 알린다. 빠진 것을 못 본 것으로 두지 않는다. */
const FAILED = [];
/** 가로로 넘친 화면 — "깨짐 0" 판정의 객관 지표다. */
const OVERFLOW = [];

// ── public — 비인증 실라우트 ─────────────────────────────────────────────
async function capturePublic(browser) {
  mkdirSync(dir('public'), { recursive: true });
  // 서버가 살아 있는지 먼저 본다 — 죽은 서버에 대고 찍으면 **빈 페이지가 조용히 저장된다.**
  try {
    execSync(`curl -sf -o /dev/null "${BASE}/"`, { stdio: 'ignore' });
  } catch {
    console.error(`서버가 없다: ${BASE}\n  먼저 \`npx next build && npx next start -p 3100\` 을 띄운다.`);
    process.exit(3);
  }
  const ctx = await browser.newContext();
  console.log(`\n[public] 비인증 실라우트 — ${PUBLIC_SCREENS.length}화면 × ${WIDTHS.length}폭`);
  for (const s of PUBLIC_SCREENS) {
    for (const w of WIDTHS) await shot(ctx, `${BASE}${s.path}`, w, `${dir('public')}/${s.name}-${w}.png`, true, s.name);
    console.log(`  ${s.name.padEnd(10)} ${s.path.padEnd(12)} ${s.note}`);
  }
  await ctx.close();
}

// ── fixture — 인증 뒤 화면의 표시 층 ─────────────────────────────────────
async function captureFixture(browser) {
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

  const ctx = await browser.newContext();
  console.log(`\n[auth-fixture] 표시 층 SSR — ${Object.keys(FIXTURE_FILES).length}화면 (QA 계정 대역)`);
  for (const [name, f] of Object.entries(FIXTURE_FILES)) {
    const page = `${raw}/${name}-page.html`;
    writeFileSync(page, wrap(readFileSync(`${raw}/${f.body}`, 'utf8')), 'utf8');
    const url = `file:///${page.replace(/\\/g, '/')}`;
    // 전체 높이가 뜻이 없는 것(시트 = position:fixed)은 390 한 폭만 찍는다.
    const widths = f.full ? WIDTHS : [390];
    for (const w of widths) await shot(ctx, url, w, `${dir('auth-fixture')}/${name}-${w}.png`, f.full, name);
    console.log(`  ${name.padEnd(14)} ${widths.join('·')}`);
  }
  await ctx.close();
}

// ── auth — 인증 뒤 실라우트 ──────────────────────────────────────────────
async function captureAuth(browser) {
  const e = env();
  const cohort = process.env.SHOT_COHORT ?? '';
  // ★ 운영자 자격이 U-6 에서 늘었다 — 없으면 `/admin` 둘은 **못 본 것**이지 통과가 아니다.
  const missing = ['QA_USER_EMAIL', 'QA_USER_PASSWORD', 'QA_COACH_EMAIL', 'QA_COACH_PASSWORD',
                   'QA_ADMIN_EMAIL', 'QA_ADMIN_PASSWORD'].filter((k) => !e[k]);
  if (missing.length) {
    // **값을 찍지 않는다.** 없는 키 이름만 말한다.
    console.error(`.env.local 에 QA 자격이 없다: ${missing.join(', ')}\n  절차서 8단계를 먼저 마친다.`);
    process.exit(4);
  }
  if (!cohort) {
    console.error('SHOT_COHORT 가 없다 — QA 차수 **id** 를 넣는다(코드가 아니라 id).');
    process.exit(5);
  }
  mkdirSync(dir('auth'), { recursive: true });

  /** 화면(UI)으로 로그인한다 — 쿠키를 손으로 만들지 않는다(형식에 결합되면 조용히 깨진다). */
  async function login(role) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: 'commit' });
    await settle(page, `login(${role})`);
    // 역할이 셋이다(U-6) — 삼항 둘을 겹치면 새 역할이 늘 때 **조용히 참여자로 떨어진다.**
    const CRED = {
      user: [e.QA_USER_EMAIL, e.QA_USER_PASSWORD],
      coach: [e.QA_COACH_EMAIL, e.QA_COACH_PASSWORD],
      admin: [e.QA_ADMIN_EMAIL, e.QA_ADMIN_PASSWORD],
    };
    const [id, pw] = CRED[role] ?? CRED.user;
    await page.getByLabel(/이메일/).fill(id);
    await page.getByLabel(/비밀번호/).fill(pw);
    await page.getByRole('button', { name: /로그인/ }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 });
    await page.close();
    return ctx;
  }

  console.log(`\n[auth] 인증 뒤 실라우트 — ${AUTH_SCREENS.length}화면 × ${WIDTHS.length}폭`);
  for (const role of ['user', 'coach']) {
    const list = AUTH_SCREENS.filter((s) => s.role === role);
    if (list.length === 0) continue;
    const ctx = await login(role);
    for (const s of list) {
      const path = s.path.replace('{cohort}', cohort);
      const widths = s.full === false ? [390] : WIDTHS;
      for (const w of widths) await shot(ctx, `${BASE}${path}`, w, `${dir('auth')}/${s.name}-${w}.png`, s.full !== false, s.name, s.open);
      console.log(`  [${role}] ${s.name.padEnd(14)} ${path.padEnd(28)} ${s.note}`);
    }
    await ctx.close();
  }
}

/**
 * **이 주소를 절차서에 적어도 되는가.** 셋을 잰다 — 배포된 커밋 · QA 로그인 · QA 차수 노출.
 *
 * **확인하지 않은 URL 을 절차서에 적으면 사람이 엉뚱한 화면을 본다.**
 * 운영에는 아직 브랜치가 안 나가 있고 프리뷰에는 나가 있는 상황이 실제로 있었다(4차 F-5).
 * 그래서 *"열리더라"* 가 아니라 **무엇이 열렸는지**를 잰다.
 */
async function preflight(browser) {
  const e = env();
  console.log("");
  console.log(`[preflight] ${BASE}`);
  let ok = true;

  // ① 배포 신원 — 어느 커밋이 서 있는가
  const ctx0 = await browser.newContext();
  const p0 = await ctx0.newPage();
  const res = await p0.goto(`${BASE}/api/version`, { waitUntil: 'commit' }).catch(() => null);
  if (!res || !res.ok()) { console.error('  X 열리지 않는다(인증 보호이거나 미배포)'); ok = false; }
  else {
    const v = JSON.parse(await p0.locator('body').innerText());
    console.log(`  O 배포 ${v.commitShort} · ref=${v.ref} · env=${v.env}`);
    console.log(`    (브랜치 최신과 대조는 호출한 쪽이 한다 — git rev-parse origin/<브랜치>)`);
  }
  await ctx0.close();
  if (!ok) return false;

  // ② QA 로그인 · ③ QA 차수 노출
  const missing = ['QA_USER_EMAIL', 'QA_USER_PASSWORD'].filter((k) => !e[k]);
  if (missing.length) { console.error(`  X .env.local 에 ${missing.join(', ')} 가 없다`); return false; }
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'commit' });
  await settle(page, 'preflight login');
  try {
    await page.getByLabel(/이메일/).fill(e.QA_USER_EMAIL);
    await page.getByLabel(/비밀번호/).fill(e.QA_USER_PASSWORD);
    await page.getByRole('button', { name: /로그인/ }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 });
    console.log('  O QA 참여자 로그인');
  } catch {
    console.error('  X QA 참여자 로그인 실패');
    await ctx.close();
    return false;
  }
  await page.goto(`${BASE}/home`, { waitUntil: 'commit' });
  await settle(page, 'preflight home');
  const body = await page.locator('body').innerText();
  const hasQa = body.includes('[QA]');
  const hasReal = body.includes('예봄 2기');
  console.log(hasQa ? '  O QA 차수가 보인다' : '  X QA 차수가 안 보인다');
  if (hasReal) console.error('  X 실기수(예봄 2기)가 보인다 — 계정을 잘못 잡았다');
  await ctx.close();
  return hasQa && !hasReal;
}

const browser = await chromium.launch();
try {
  if (MODE === 'public' || MODE === 'all') await capturePublic(browser);
  if (MODE === 'fixture' || MODE === 'all') await captureFixture(browser);
  if (MODE === 'auth') await captureAuth(browser);
  if (MODE === 'preflight') {
    const ok = await preflight(browser);
    console.log("");
    console.log(ok ? 'O 이 주소를 절차서에 적어도 된다' : 'X 이 주소를 절차서에 적으면 안 된다');
    if (!ok) process.exitCode = 6;
  }
} finally {
  await browser.close();
}

// preflight 은 찍지 않으므로 캡처 요약도 산출 안내도 뜻이 없다.
if (MODE !== 'preflight') {
// 요약 — **없는 것을 없다고 말한다.** 개별 실패는 그때그때 찍히지만,
//   끝에서 한 번 더 세지 않으면 스크롤에 묻힌다.
console.log("");
console.log(FAILED.length ? "X 캡처 실패 " + FAILED.length + "장: " + FAILED.join(", ") : "O 캡처 실패 0");
console.log(OVERFLOW.length
  ? "X 가로 넘침 " + OVERFLOW.length + "건: " + OVERFLOW.join(", ")
  : "O 가로 넘침 0 — 전 화면 전 폭에서 가로 스크롤이 생기지 않는다");

console.log(`\n산출: ${OUT}/`);
console.log('  public/       — 비인증 실라우트(진짜 화면)');
console.log('  auth-fixture/ — 인증 뒤 화면의 표시 층(대역)');
console.log('  auth/         — 인증 뒤 실라우트(QA 자격 필요)');
}
