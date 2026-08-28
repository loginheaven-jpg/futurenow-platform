// 화면 크롬 표 — **제목과 뒤로는 라우트의 성질이다** (U-2 · 지휘부 판정 (다) 2026-08-31).
//
// **화면이 자기 제목을 아는 것은 우연이지 필연이 아니다.** 껍데기가 헤더를 그리려면
//   제목과 뒤로를 알아야 하고, 그 둘은 화면의 사정이 아니라 **라우트의 사정**이므로 여기 모은다.
//
// **왜 `_lib` 인가**(지휘부 조건 ②): 화면 디렉터리에 두면 다음 사람이 **화면 부속**으로 읽는다.
//
// **뒤로는 값이 아니라 규칙이다**(지휘부 조건 ③): 제목은 문자열이지만 **뒤로는 경로**라
//   박아 두면 라우트가 바뀔 때 낡는다. 기본은 **가장 가까운 조상 라우트**이고,
//   규칙이 안 통하는 자리만 값으로 박는다. `CLAUDE.md` §11 의 값 두 분류 그대로다.
//
// **표에 없는 라우트가 생기면 운다**(지휘부 조건 ①): `tests/screenChrome.test.ts` 가
//   껍데기 아래 모든 `page.tsx` 가 여기 있는지 잰다. 없으면 **빈 제목이 조용히 나온다.**
//
// ⚠ **여기 제목은 하나도 지어내지 않았다.** 전부 각 화면이 쓰던 `AppHeader title` 을 그대로 옮겼다.
//   한 번 지어냈다가 되돌렸다 — 터미널이 한글을 깨뜨린 출력을 옮겨 적어 다섯이 틀렸고,
//   파일로 뽑아 읽어 고쳤다(계열 ⑦ — 정본에서 읽지 않고 추측한 값).
import { VALUE_TOOL } from '@/instruments/futurenow/values/copy';

/**
 * 헤더 모드 — `AppHeader` 의 `variant` 셋에 `member` 를 더한다.
 *   `member` 는 **제목 바가 아니라 로고 GNB** 다(`SiteGnb variant="member"`).
 *   그 셋은 제목이 없다 — **없는 것을 지어내지 않으려고 타입으로 갈랐다.**
 */
export type ChromeKind =
  | { kind: 'gnb'; menu: true }
  | { kind: 'bar'; variant: 'root' | 'sub' | 'flow'; title: string; back?: string; menu: boolean; actions?: true };

/**
 * 라우트 패턴 → 크롬. 키는 Next 라우트 패턴 그대로다.
 * **라우트 그룹 `(member)` 는 키에 넣지 않는다** — URL 에 안 나타난다.
 */
export const SCREEN_CHROME: Record<string, ChromeKind> = {
  // ── 로고 GNB 셋 — 지금 `SiteGnb variant="member"` 를 그리는 화면들. 제목이 없다.
  '/home': { kind: 'gnb', menu: true },
  '/home/assessments': { kind: 'gnb', menu: true },
  '/my/cohorts/[cohortId]': { kind: 'gnb', menu: true },

  // ── 제목 바 — 제목·뒤로 전부 실측값이다.
  '/account': { kind: 'bar', variant: 'root', title: '내 정보', menu: true, actions: true },
  // 조상이 `/` 라 규칙이 안 통한다 — 회원의 처음 화면은 `/home` 이다.
  '/feed': { kind: 'bar', variant: 'sub', title: '동행', back: '/home', menu: true },
  '/pending': { kind: 'bar', variant: 'sub', title: '가입 신청', back: '/home', menu: true },
  '/my/cohorts': { kind: 'bar', variant: 'root', title: '내 차수', menu: true, actions: true },
  '/my/cohorts/[cohortId]/checkin/[session]': { kind: 'bar', variant: 'sub', title: '오늘의 갈무리', menu: true, actions: true },
  '/my/cohorts/[cohortId]/journey': { kind: 'bar', variant: 'sub', title: '나의 기록', menu: true, actions: true },
  // 조상은 차수 홈이나 **원래 목적지가 차수 목록**이었다 — 규칙을 덮는다.
  '/my/cohorts/[cohortId]/report': { kind: 'bar', variant: 'sub', title: '내 마음의 거울', back: '/my/cohorts', menu: true, actions: true },

  // ── `flow` 둘 — **메뉴를 달지 않는다.**
  //   `AppHeader` 정의가 *진입 선형 플로우용, 일부러 출구 없음* 이라 못 박았다.
  //   껍데기가 메뉴를 달면 **확정을 코드가 뒤집는다.** 규칙 2는 *메뉴는 한 자리에서만 열린다* 이지
  //   *모든 화면에 메뉴가 있다* 가 아니므로 부딪히지 않는다(지휘부 판정 2026-08-31).
  '/my/values': { kind: 'bar', variant: 'flow', title: VALUE_TOOL, menu: false },
  '/my/cohorts/[cohortId]/values': { kind: 'bar', variant: 'flow', title: VALUE_TOOL, menu: false },
};

/** 가장 가까운 조상 라우트 — 뒤로의 **규칙**. 값으로 박지 않는다. */
export function nearestAncestor(pattern: string): string | undefined {
  const segs = pattern.split('/').filter(Boolean);
  for (let i = segs.length - 1; i >= 1; i--) {
    const cand = `/${segs.slice(0, i).join('/')}`;
    if (SCREEN_CHROME[cand]) return cand;
  }
  return undefined;
}

/** 실제 경로를 라우트 패턴으로 되돌린다(`/my/cohorts/abc/journey` → `/my/cohorts/[cohortId]/journey`). */
export function patternOf(pathname: string, params: Record<string, string | string[] | undefined>): string {
  let out = pathname;
  for (const [k, v] of Object.entries(params)) {
    if (typeof v !== 'string' || !v) continue;
    out = out.split(`/${v}`).join(`/[${k}]`);
  }
  return out;
}

/** 뒤로 목적지를 실제 경로로 — 패턴의 `[x]` 를 지금 params 로 되돌린다. */
export function resolveBack(pattern: string, params: Record<string, string | string[] | undefined>): string | undefined {
  const c = SCREEN_CHROME[pattern];
  if (!c || c.kind !== 'bar') return undefined;
  const target = c.back ?? nearestAncestor(pattern);
  if (!target) return undefined;
  let out = target;
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && v) out = out.split(`[${k}]`).join(v);
  }
  return out;
}
