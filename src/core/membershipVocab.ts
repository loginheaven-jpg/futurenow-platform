// 회원 표시 **어휘와 조립 규칙 — 단일 출처** (5차 T-3 · 최박사 확정 2026-08-29).
//
// **여기 있는 것과 없는 것.**
//   있다: tier 이름 셋 · tier 별 한 줄 설명 · 소속 역할 이름 둘 · 조립 규칙 ·
//         `underReview` 진행 문안 · 문의 안내 · `held` 의 뜻 한 줄.
//   없다: 완성된 문자열. **서버가 문자열을 만들지 않는다** — 값만 내리고 **조립은 화면이 한다**
//         (최박사 지시). 문언이 서버에 박히면 단일 출처가 둘이 된다.
//
// **읽는 곳이 셋이다**(발주 §3): 내 정보(`/account`) · 공개 현관 칩 · 운영자 화면.
//   5-2 운영자 도구가 나중에 이것을 읽는다. 그래서 화면 옆이 아니라 코어에 둔다.
//
// **T-5(`roleTargets`)와의 관계** — 사본이 아니다. 입력이 같고 **출력이 다른 두 함수**다
//   (하나는 갈 곳을, 하나는 표시를 낸다). 사본이 될 수 있는 자리는 **어휘뿐**이라
//   역할 이름을 여기 두고 양쪽이 읽는다.
//
// ─────────────────────────────────────────────────────────────────────────────
// **문안은 최박사 원문이다. 한 글자도 다듬지 않았다.**
//   좁히지 않는다 — *진단* 이 아니라 **진단 등 모든 도구**다. 원문이 초안보다 넓다.
// ─────────────────────────────────────────────────────────────────────────────
import type { CohortRole, CohortRoleKind, MemberState, MemberTier, MembershipView } from '@/contracts/domain';

/**
 * **`held` 의 뜻 — 한 줄.**
 *
 * 지금까지 이 뜻은 정본 어디에도 한 줄로 적혀 있지 않았다. 세 자리에 흩어져 있었다 —
 * `member_state()` 주석(*운영자가 막은 사람을 코드 한 줄로 뚫는 길이 생긴다*) ·
 * ADR-122(같은 취지) · `/pending` 화면 문안(*확인이 필요한 신청입니다*).
 * **흩어져 있다는 것 자체가 결함이라** 여기에 모은다(지휘부 지시).
 *
 * > **`held` 는 자격 확인이 끝나지 않아 운영자가 붙들어 둔 상태다.**
 * > 한때 있던 자격이 끝난 것(`expired`)이 아니라 **아직 열어 준 적이 없는 쪽**이다.
 * > 운영자만 손으로 건다(`decide_membership`) — 자동으로 붙는 경로가 없고,
 * > 기수 마감 트리거도 `held` 를 건드리지 않는다(*트리거가 운영자 판단을 뒤집지 않는다*).
 * > 판정에서 **무엇보다 먼저**다(`held > cohort > 저장 > pending`) — 그러지 않으면
 * > 기수에 등록되는 것만으로 보류가 무력화된다.
 * > 유효기간을 달 수 없다(*보류·만료에 기간을 다는 것은 뜻이 없다*).
 *
 * **그래서 `held` 는 tier 가 아니라 진행 표시다** — 자격은 여전히 `visitor`(방문회원)이고,
 * 그 위에 *확인 중* 이라는 표시가 얹힌다. tier 로 두면 *보류* 가 자격 이름 자리에 앉아
 * `suspended`(이용 보류)와 한 화면에서 겹친다.
 */
export const HELD_MEANING =
  'held 는 자격 확인이 끝나지 않아 운영자가 붙들어 둔 상태다. 한때 있던 자격이 끝난 것(expired)이 아니라 아직 열어 준 적이 없는 쪽이고, 운영자만 손으로 건다.';

/** tier 이름 셋 — 참여자에게 보이는 자격 이름. */
export const TIER_LABEL: Record<MemberTier, string> = {
  visitor: '방문회원',
  forum: '포럼회원',
  // `expired` 의 이름. 한때 *이용 중지* 로 정해졌다가 최박사가 **이용 보류**로 되돌리셨다 —
  //   더 완곡해서 좋다는 것이다.
  suspended: '이용 보류',
};

/** tier 별 한 줄 설명 — **최박사 원문**. */
export const TIER_LEAD: Record<MemberTier, string> = {
  visitor: '승인을 기다리는 중입니다. 세미나 참여와 포럼회원 신청을 하실 수 있습니다.',
  forum: '포럼회원자격 유지기간 동안 진단 등 모든 도구를 이용하실 수 있습니다.',
  suspended: '계정 이용이 보류되었습니다. 문의해 주세요.',
};

/** 소속 역할 이름 둘. T-5 `roleTargets` 도 이 어휘를 읽는다(사본 방지). */
export const COHORT_ROLE_LABEL: Record<CohortRoleKind, string> = {
  participant: '참여자',
  coach: '인도자',
};

/**
 * 소속 칩의 한 줄 설명 — **최박사 원문**(`○○기 참여자` 항).
 * 인도자 칩에는 이 문장을 붙이지 않는다 — 원문이 참여자에 대해 한 말이고,
 * 인도자용 문장은 확정에 없다. **없는 문장을 지어내지 않는다.**
 */
export const PARTICIPANT_LEAD = '세미나 기간 동안 진단 등 모든 도구를 이용하실 수 있습니다.';

/** `underReview` 진행 문안 — 참여자 문안은 **현행 유지**다(`/pending` 과 같은 문장). */
export const UNDER_REVIEW_NOTE = '확인이 필요한 신청입니다.';

/** 등급 조정 문의 안내 — 최박사 지시로 노출한다. */
export const TIER_INQUIRY_NOTE = '회원등급 조정에 대해 궁금하시면 운영자에게 문의해 주세요.';

/**
 * 소속 칩 한 칸의 글자 — **기수명을 그대로 쓴다.**
 *
 * 최박사 문안의 `○○기` 는 **자리표시자**이고, 실제 기수명은 `퓨처나우2026예봄2기` 처럼 길다.
 * 짧게 줄이는 규칙은 **확정에 없다.** 지어내면 그것이 계열 8번이므로 **줄이지 않는다** —
 * 기수명 그대로 + 역할 이름이다. 축약 규칙이 정해지면 **이 함수 한 곳만** 고친다.
 */
export function cohortRoleLabel(r: CohortRole): string {
  return `${r.cohortName} ${COHORT_ROLE_LABEL[r.kind]}`;
}

/**
 * **판정을 표시 축으로 편다.** 산출은 여전히 DB `member_state()` 하나뿐이고
 * 여기서는 그 결과를 **읽어 옮길 뿐** 다시 계산하지 않는다.
 *
 * | `MemberState` | tier | underReview |
 * |---|---|---|
 * | `pending` | `visitor` | false |
 * | `held` | `visitor` | **true** — tier 를 덮지 않는다 |
 * | `individual` | `forum` | false |
 * | `cohort` | `forum` | false |
 * | `expired` | `suspended` | false |
 *
 * **`cohort` 가 `forum` 인 이유**: `cohort` 는 *지금 세미나에 참여 중* 이라는 **소속**의 사실이고,
 * 그 사실은 `cohortRoles` 가 이미 말한다. 자격 축에서 이 사람은 **도구를 다 쓸 수 있는 쪽**이라
 * `forum` 과 같은 칸에 선다(`member_can_assess` 도 `cohort` 에 여정+상시를 준다 — 가장 넓다).
 * 축이 둘이므로 **같은 사실을 두 번 말하지 않는다.**
 */
export function toMembershipView(state: MemberState, cohortRoles: CohortRole[]): MembershipView {
  const tier: MemberTier =
    state === 'expired' ? 'suspended'
      : state === 'individual' || state === 'cohort' ? 'forum'
        : 'visitor'; // pending · held
  return { tier, underReview: state === 'held', cohortRoles };
}
