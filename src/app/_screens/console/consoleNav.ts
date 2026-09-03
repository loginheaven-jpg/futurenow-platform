// 콘솔 내비 항목 계산 — **순수 함수**(3차 T-4).
//
// 경로 하나에서 항목을 낸다. 서버 데이터를 받지 않는 이유는 두 가지다 —
//   ⓐ 내비가 데이터를 기다리면 화면이 늦게 서고, ⓑ 레이아웃이 회기를 조회하면
//   모든 콘솔 화면에 왕복이 하나씩 는다. 경로가 이미 문맥을 담고 있으므로 그것만 읽는다.
//
// ★ **ⓑ 는 U-5 에서 실측으로 뒤집혔다** — `/coach/cohort/[cohortId]` 아래 **여덟 중 일곱이
//   이미 `getCohort` 를 부른다**(예외는 `checkin/preview` 하나). 회기 이름은 서버 손에 이미
//   있었고 **없던 것은 조회가 아니라 넘길 길**이었다. 그래도 **이 함수는 여전히 순수하다** —
//   이름은 `useSetCohortName` 통로가 나르고, 여기는 경로만 읽는다(기각 근거 ⓐ 는 유효하다).
//
// `loginOutcome`·`safeReturn`·`rosterModel` 과 같은 관행이다 — 판정을 순수 함수로 떼어
//   테스트가 닿게 한다.


import { VALUE_TOOL } from '@/instruments/futurenow/values/copy';

export interface ConsoleNavItem {
  href: string;
  label: string;
}

export interface ConsoleNavGroup {
  title: string | null;
  items: ConsoleNavItem[];
}

/**
 * 회기 띠가 드는 묶음의 이름. **띠와 시트가 같은 낱말을 읽는다**(불변식 23).
 */
export const TAB_GROUP = '이 회기';

/**
 * 한 회기 안에서 오가는 항목 다섯 — **띠의 탭**이 그대로 이것이다(U-5).
 *
 * 역할을 받지 않는다: 인도자와 운영자가 **같은 다섯**을 본다(ADR-51 · ADR-74).
 * 그래서 서버(회기 레이아웃)도 이 함수 하나만 부르면 된다.
 *
 * **이름에서 「회기」를 뺐다**(지휘부 결재 2026-09-03) — 띠 왼쪽 칩이 이미 *어느 회기인가*를
 *   말하므로 「회기 대시보드」는 같은 말을 두 번이다.
 */
export function cohortTabs(cohortId: string): ConsoleNavItem[] {
  return [
    { href: `/coach/cohort/${cohortId}`, label: '대시보드' },
    { href: `/coach/cohort/${cohortId}/checkin`, label: '회차 갈무리' },
    // ★ **탭 이름이 화면의 실체와 달랐다**(U-6 실측) — 이 화면은 `listCohortCheckins` 로 그리는
    //   **갈무리 격자**이고 진짜 진단 결과는 `/group`·`/report` 다. 표(`SCREEN_CHROME`)와
    //   본문 링크(「격자로 보기」)는 처음부터 「갈무리 격자」였고 **탭만 달랐다.**
    { href: `/coach/cohort/${cohortId}/matrix`, label: '갈무리 격자' },
    // ★ **표는 `VALUE_TOOL` 을 읽는데 탭만 손으로 적고 있었다**(U-6 · 반증자가 잡았다).
    //   글자가 같다는 것과 한 출처를 읽는다는 것은 다르다 — 잠금 없는 사본 둘이었다.
    { href: `/coach/cohort/${cohortId}/values`, label: VALUE_TOOL },
    { href: `/feed?cohort=${cohortId}`, label: '동행' },
  ];
}

/** `/coach/cohort/{uuid}/…` 에서 회기 id 를 꺼낸다. 아니면 null. */
export function cohortIdOf(pathname: string): string | null {
  const m = /^\/coach\/cohort\/([0-9a-fA-F-]{36})(?:\/|$)/.exec(pathname);
  return m ? m[1] : null;
}

// ★★ **`consoleNav()` 를 걷었다**(U-6). 런타임 호출자가 **0**이었다 —
//   콘솔 시트를 짓는 것은 `consoleSheet.ts`(`ConsoleLayout` 이 부른다)이고, 띠는 `cohortTabs` 다.
//   그런데 이 파일 안에 「모든 회기」·「회기 개설」·「본부」·「가입 승인」이 **또** 적혀 있어
//   시트와 사본 둘이었다. 고아를 남기면 다음 사람이 살아 있는 줄 알고 그것을 고친다.
//
//   **잠금 둘이 이 파일을 근거로 삼고 있었다** — `MemberShell.test.tsx`(`CONSOLE_DOOR`)와
//   `library.copy.test.ts`(`_vocab/library`). 죽은 파일을 근거로 삼은 잠금은 함께 죽으므로
//   **먼저 그 둘을 `consoleSheet.ts` 로 옮기고** 걷었다(반증자가 이 순서를 잡아 주었다).

/**
 * 현재 항목 판정 — **가장 긴 일치가 이긴다.**
 *
 * `exact` 플래그로 가르지 않는 이유: 그러면 내비에 없는 화면(리포트 상세·조원 세로 보기)에서
 *   **아무것도 켜지지 않아 사용자가 자기 위치를 잃는다.** 긴 일치를 쓰면
 *   `/coach/cohort/X/report/…` 에서 상위 문맥인 '회기 대시보드'가 켜져 위치가 남는다.
 *   동시에 `/coach/cohort/X/checkin` 에서는 '회차 갈무리'가 '회기 대시보드'를 이긴다.
 *
 * 경계는 세그먼트 단위다 — `/coach` 가 `/coaching` 을 켜지 않는다.
 * 쿼리(`/feed?cohort=…`)는 경로만 비교한다.
 */
function pathOf(item: ConsoleNavItem): string {
  return item.href.split('?')[0];
}

function matches(item: ConsoleNavItem, pathname: string): boolean {
  const p = pathOf(item);
  return pathname === p || pathname.startsWith(`${p}/`);
}

/** 켜질 항목의 href(쿼리 포함). 없으면 null. */
export function currentHref(groups: ConsoleNavGroup[], pathname: string): string | null {
  let best: ConsoleNavItem | null = null;
  for (const g of groups) {
    for (const it of g.items) {
      if (!matches(it, pathname)) continue;
      if (!best || pathOf(it).length > pathOf(best).length) best = it;
    }
  }
  return best ? best.href : null;
}

export function isCurrent(item: ConsoleNavItem, pathname: string, groups: ConsoleNavGroup[]): boolean {
  return currentHref(groups, pathname) === item.href;
}
