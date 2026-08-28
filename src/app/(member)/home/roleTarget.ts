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
import { COHORT_ROLE_LABEL } from '@/core/membershipVocab';

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

// **역할 이름은 단일 출처에서 읽는다**(5차 T-3 · 지휘부 지시).
//   *"사본이 될 수 있는 자리는 어휘뿐이다. 기수명 표기와 역할 이름이 그것이고,
//    그래서 그 둘을 단일 출처에 두고 양쪽이 읽게 하라. 그러면 세 번째로 데지 않는다."*
//   `운영자` 만 여기 남는다 — 그것은 소속 역할이 아니라 시스템 권한이라 `COHORT_ROLE_LABEL` 에 없다.
const ROLE_WORD: Record<Role, string> = {
  admin: '운영자',
  coach: COHORT_ROLE_LABEL.coach,
  user: COHORT_ROLE_LABEL.participant,
};

/**
 * 역할과 내 차수로 거점을 고른다.
 *
 * **가두지 않는다**(ADR-51) — 이 카드는 *네 자리는 저기다* 라고 가리킬 뿐이고,
 * 아래 `MemberHome` 이 다른 길을 계속 연다. 그 성질은 그대로다.
 *
 * ── 5차 T-5 · **복수 반환** (발주 §5 · 확정 4 겸직 허용) ─────────────────
 *
 * **겸직은 이미 사실이다.** 운영 실측(2026-08-29): 인도자·운영자의 회기 등록이
 * `admin 4행 + coach 3행 = 7행`, 사람으로는 **3명**. 발주 §5 가 적은 *7행* 과 일치한다.
 * 그런데 이 함수가 거점을 **하나만** 골라서, 인도자이면서 다른 회기 참여자인 사람에게
 * **참여자 카드가 서지 않았다.** 자기 여정으로 가는 길이 홈에서 사라진다.
 *
 * **목적지를 한 곳도 바꾸지 않는다** — 늘어나는 것은 **카드 수뿐**이다.
 * 그래서 기존 다섯 경우 테스트가 그대로 통과한다(`[0]` 이 옛 반환과 같다).
 *
 * 순서: **운영/인도자 카드가 먼저, 참여자 카드가 뒤.** 역할이 곧 그 사람의 주 거점이고,
 * 참여자 카드는 *덧붙는* 것이기 때문이다. 순서를 데이터가 아니라 **규칙**이 정한다.
 */
export function roleTargets(role: Role, cohorts: MyCohortSummary[]): RoleTarget[] {
  const out: RoleTarget[] = [];
  const who = ROLE_WORD[role];

  if (role === 'admin') {
    out.push({ href: '/admin', who, title: '본부', sub: '승인·회원·차수를 관리합니다.', ctaLabel: '본부로 가기' });
  }
  if (role === 'coach') {
    out.push({ href: '/coach', who, title: '인도자 콘솔', sub: '내 차수와 조원을 봅니다.', ctaLabel: '콘솔로 가기' });
  }

  // 참여자 거점. 역할이 있어도 **자기 회기가 있으면** 카드가 하나 더 선다(겸직).
  //   `who` 는 이 카드에서 언제나 `참여자` 다 — 이 칸은 *이 카드에서 내가 무엇인가* 를 말한다.
  const participant = participantTarget(cohorts, ROLE_WORD.user);
  // 역할 카드가 이미 있는 사람에게 **빈손 카드**(체크 보기)를 덧붙이지 않는다 —
  //   그것은 겸직이 아니라 *할 일 없음* 이고, 인도자 홈에서 노이즈가 된다.
  if (out.length === 0 || participant.href !== '/home/assessments') out.push(participant);

  return out;
}

/**
 * 옛 이름 — **거점 하나**. 목적지가 바뀌지 않았음을 이 함수가 증명한다(회귀 0).
 * 호출부가 남아 있는 동안 유지한다.
 */
export function roleTarget(role: Role, cohorts: MyCohortSummary[]): RoleTarget {
  return roleTargets(role, cohorts)[0];
}

function participantTarget(cohorts: MyCohortSummary[], who: string): RoleTarget {
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
