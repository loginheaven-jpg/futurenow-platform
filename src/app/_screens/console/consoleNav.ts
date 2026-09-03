// 콘솔 내비 항목 계산 — **순수 함수**(3차 T-4).
//
// 경로 하나에서 항목을 낸다. 서버 데이터를 받지 않는 이유는 두 가지다 —
//   ⓐ 내비가 데이터를 기다리면 화면이 늦게 서고, ⓑ 레이아웃이 차수를 조회하면
//   모든 콘솔 화면에 왕복이 하나씩 는다. 경로가 이미 문맥을 담고 있으므로 그것만 읽는다.
//
// ★ **ⓑ 는 U-5 에서 실측으로 뒤집혔다** — `/coach/cohort/[cohortId]` 아래 **여덟 중 일곱이
//   이미 `getCohort` 를 부른다**(예외는 `checkin/preview` 하나). 회기 이름은 서버 손에 이미
//   있었고 **없던 것은 조회가 아니라 넘길 길**이었다. 그래도 **이 함수는 여전히 순수하다** —
//   이름은 `useSetCohortName` 통로가 나르고, 여기는 경로만 읽는다(기각 근거 ⓐ 는 유효하다).
//
// `loginOutcome`·`safeReturn`·`rosterModel` 과 같은 관행이다 — 판정을 순수 함수로 떼어
//   테스트가 닿게 한다.

import { CONSOLE_DOOR } from '@/app/_vocab/doors';
import { LIBRARY_NAME } from '@/app/_vocab/library';

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
    { href: `/coach/cohort/${cohortId}/matrix`, label: '진단 결과' },
    { href: `/coach/cohort/${cohortId}/values`, label: '가치 카드' },
    { href: `/feed?cohort=${cohortId}`, label: '동행' },
  ];
}

/** `/coach/cohort/{uuid}/…` 에서 차수 id 를 꺼낸다. 아니면 null. */
export function cohortIdOf(pathname: string): string | null {
  const m = /^\/coach\/cohort\/([0-9a-fA-F-]{36})(?:\/|$)/.exec(pathname);
  return m ? m[1] : null;
}

/**
 * 역할과 경로로 내비를 만든다.
 *
 * 시안 P2 는 사이드바 항목이 **기수 문맥**을 갖는다(기수 대시보드·회차 갈무리·진단 결과·동행…).
 *   그래서 차수 안에 있을 때만 그 묶음을 낸다 — 차수 밖에서 차수 항목을 보이면 어디로 가는지 모른다.
 *
 * **운영자에게도 인도자 묶음을 준다.** 운영자는 자기 차수를 갖고(ADR-74 수퍼바이저 뷰)
 *   콘솔을 그대로 쓴다. 역할로 화면을 가르지 않는 것이 ADR-51 의 방향이다.
 */
export function consoleNav(input: { role: 'user' | 'coach' | 'admin'; pathname: string }): ConsoleNavGroup[] {
  const { role, pathname } = input;
  if (role === 'user') return []; // 참여자 화면에는 콘솔 내비를 두지 않는다(발주 §5)

  const groups: ConsoleNavGroup[] = [];

  groups.push({
    title: '인도자',
    items: [
      { href: CONSOLE_DOOR.href, label: CONSOLE_DOOR.label }, // U-4 §3 — 표의 제목과 같은 이름을 쓴다
      { href: '/coach/cohorts', label: '모든 차수' },
      { href: '/coach/new', label: '차수 개설' },
    ],
  });

  const cohortId = cohortIdOf(pathname);
  if (cohortId) groups.push({ title: TAB_GROUP, items: cohortTabs(cohortId) });

  if (role === 'admin') {
    groups.push({
      title: '운영',
      items: [
        { href: '/admin', label: '본부' },
        { href: '/admin/approvals', label: '가입 승인' },
      ],
    });
  }

  groups.push({ title: null, items: [{ href: '/library', label: LIBRARY_NAME }] });
  return groups;
}

/**
 * 현재 항목 판정 — **가장 긴 일치가 이긴다.**
 *
 * `exact` 플래그로 가르지 않는 이유: 그러면 내비에 없는 화면(리포트 상세·조원 세로 보기)에서
 *   **아무것도 켜지지 않아 사용자가 자기 위치를 잃는다.** 긴 일치를 쓰면
 *   `/coach/cohort/X/report/…` 에서 상위 문맥인 '기수 대시보드'가 켜져 위치가 남는다.
 *   동시에 `/coach/cohort/X/checkin` 에서는 '회차 갈무리'가 '기수 대시보드'를 이긴다.
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
