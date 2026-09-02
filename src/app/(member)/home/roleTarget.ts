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
  /**
   * **거점이 아니라 폴백이다**(ADR-173). 기수가 없는 사람에게 세우는 「체크 보기」 한 장이 그것이다.
   *
   * ★ **성질을 파생하지 않으려고 칸으로 둔다.** 착지 규칙이 「카드가 한 장이면 막바로」인데,
   *   폴백까지 막바로 보내면 **자기 자리가 아닌 곳에 떨어진다** — 기수 없는 사람은
   *   `/home` 의 소식·서가가 유일한 내용이고 그것을 영영 못 본다.
   *   `href` 를 보고 「`/home/assessments` 면 폴백」이라 유추하면 U-4 형태다(성질 파생).
   *   **누가 폴백인지는 만든 자리가 안다.** 그래서 여기서 표시한다.
   */
  fallback?: true;
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
  // ★ **운영자에게도 인도자 카드를 준다**(ADR-173 · 지휘부 지시 2026-09-02).
  //
  //   **없던 문을 만드는 것이 아니라 있는 문을 가리키는 것이다.** 운영자는 이미 `/coach` 에
  //   들어가고 거기서 **전 차수를 본다**(`coach/page.tsx` 의 `isAdmin` 갈래 · ADR-74).
  //   그런데 `role` 이 단일값이라 `role === 'coach'` 가 안 걸려 **홈에 그 길이 없었다** —
  //   권한은 있는데 문패가 없는 상태였다.
  //
  //   `who` 는 이 카드에서 **언제나 「인도자」**다. 이 칸은 *이 카드에서 내가 무엇인가* 를 말하고,
  //   참여자 카드가 역할과 무관하게 「참여자」인 것과 같은 규칙이다.
  //   `sub` 만 갈린다 — 운영자는 자기 차수가 아니라 전부를 보기 때문이다.
  if (role === 'coach' || role === 'admin') {
    out.push({
      href: '/coach',
      who: ROLE_WORD.coach,
      title: '인도자 콘솔',
      sub: role === 'admin' ? '모든 차수를 봅니다.' : '내 차수와 조원을 봅니다.',
      ctaLabel: '콘솔로 가기',
    });
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
  return { href: '/home/assessments', who, title: '체크', sub: '지금 하실 수 있는 체크를 봅니다.', ctaLabel: '체크 보기', fallback: true };
}


/**
 * **로그인 직후 어디로 보낼 것인가** — 판정을 여기 한 곳에 둔다(ADR-173).
 *
 * 규칙은 한 줄이다 — **거점이 하나뿐이면 홈을 거치지 않는다.**
 *   여럿이면 홈에서 고르게 한다(지시 case 3·4). 폴백 한 장은 거점이 아니므로 홈에 남는다.
 *
 * ★ **`roleTargets` 의 산출을 그대로 센다.** 「막바로 갈 것인가」를 다른 곳에서 다시 정하면
 *   **판정이 두 곳**이 되고, 카드 규칙이 바뀌는 날 한쪽만 고쳐진다(불변식 23).
 *
 * ★ **`returnTo` 는 여기까지 오지 않는다.** 링크를 받고 온 사람은 `loginOutcome` 이
 *   먼저 그쪽으로 보낸다(지휘부 확정 2026-09-02 — 「링크가 우선이다」).
 *   이 함수는 **갈 곳이 따로 정해지지 않았을 때만** 부른다.
 */
export function landingFor(targets: RoleTarget[]): string | null {
  if (targets.length !== 1) return null;   // 여럿이면 홈에서 고른다
  const only = targets[0];
  return only.fallback ? null : only.href; // 폴백은 거점이 아니다
}
