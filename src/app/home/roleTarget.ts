// 통합 홈 역할 카드의 **목적지 판정** — 순수 (4차 F-3).
//
// **부품에서 화면 층으로 내린 계산이다.** 기존 `_screens/RoleCard.tsx` 는 `role`·`cohorts` 를 받아
//   스스로 목적지를 골랐다. F-1 강조 ①(*부품은 계산하지 않는다*)의 화면 층 적용이라
//   판정을 여기로 옮기고 `SiteRoleCard` 는 받은 것만 그린다.
//   선례는 `consoleNav(pathname)`·`buildProgress(sessions, submitted)` 다 — **인자를 받는 순수 함수**.
//
// **목적지를 한 곳도 바꾸지 않았다**(기존 기능 회귀 0). 옮긴 것은 계산이 서는 자리이지 결론이 아니다.
//   문구만 시안 B `.role-card` 의 슬롯 넷(소속 · 제목 · 부제 · CTA)에 맞춰 늘렸다.
import type { MyCohortSummary, Role } from '@/contracts';

export interface RoleTarget {
  href: string;
  /** 카드 우상단 배지 — 기수명. 없으면 그리지 않는다. */
  cohort?: string;
  /** 배지 아래 한 줄 — `참여자` · `인도자` 같은 자리 표시. */
  who: string;
  title: string;
  sub?: string;
  ctaLabel: string;
}

const ROLE_WORD: Record<Role, string> = { admin: '운영자', coach: '인도자', user: '참여자' };

/**
 * 역할과 내 차수로 **거점 하나**를 고른다.
 *
 * **가두지 않는다**(ADR-51) — 이 카드는 *네 자리는 저기다* 라고 가리킬 뿐이고,
 * 아래 `MemberHome` 이 다른 길을 계속 연다. 그 성질은 그대로다.
 */
export function roleTarget(role: Role, cohorts: MyCohortSummary[]): RoleTarget {
  const who = ROLE_WORD[role];

  if (role === 'admin') {
    return { href: '/admin', who, title: '본부', sub: '승인·회원·차수를 관리합니다.', ctaLabel: '본부로 가기' };
  }
  if (role === 'coach') {
    return { href: '/coach', who, title: '인도자 콘솔', sub: '내 차수와 조원을 봅니다.', ctaLabel: '콘솔로 가기' };
  }

  // 참여자의 거점은 '차수 홈'이다. 차수가 여럿이면 목록이 거점이 된다 — 하나를 임의로 고르지 않는다.
  const active = cohorts.filter((c) => c.status === 'active');
  if (active.length === 1) {
    const c = active[0];
    return {
      href: `/my/cohorts/${c.cohortId}`,
      cohort: c.name,
      who,
      title: '내 기수로 가기',
      // 열린 회차가 있으면 그것을 말한다. **판정이 아니라 사실이다** — 재촉하지 않는다.
      sub: c.openSessionNo != null && !c.openSessionSubmitted
        ? `${c.openSessionNo}회차 갈무리가 열려 있습니다`
        : '내 기수로 바로 갑니다.',
      ctaLabel: '기수 홈',
    };
  }
  if (active.length > 1) {
    return { href: '/my/cohorts', who, title: '내 기수', sub: '참여 중인 기수를 봅니다.', ctaLabel: '기수 목록' };
  }
  return { href: '/home/assessments', who, title: '체크', sub: '지금 하실 수 있는 체크를 봅니다.', ctaLabel: '체크 보기' };
}
