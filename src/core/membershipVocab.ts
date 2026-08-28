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
import type { CohortRole, CohortRoleKind, MemberTier, MembershipStatus, MembershipView } from '@/contracts/domain';

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
 * 기수명 축약 — **이름 끝의 `n기` 를 뽑는다**(최박사 확정 2026-08-29).
 *
 * `퓨처나우2026예봄2기` → `2기`. 화면에는 `2기 참여자` 로 뜬다.
 *
 * **규칙이 이름 형식에 의존하므로, 끝이 `n기` 가 아닌 기수는 전체 이름을 그대로 쓴다**
 * (최박사 지시). 실물로 `[QA] 검증 전용` · `체험 진단` 이 그것이다 — 억지로 줄이면
 * 없는 회차 번호를 만들어 내게 된다. **뽑히지 않는 것이 정상 경로다.**
 */
export function shortCohortName(name: string): string {
  const m = /(\d+기)$/.exec(name.trim());
  return m ? m[1] : name;
}

/** 소속 칩 한 칸의 글자 — 축약된 기수명 + 역할 이름. */
export function cohortRoleLabel(r: CohortRole): string {
  return `${shortCohortName(r.cohortName)} ${COHORT_ROLE_LABEL[r.kind]}`;
}

/**
 * **자격 저장값을 표시 축으로 편다.**
 *
 * ── 입력이 무엇인지가 이 함수의 전부다 ──────────────────────────────────────
 *
 * 입력은 **`memberships.status` 저장값**이고, 행이 없으면 `null` 이다.
 * **`member_state()` 산출값이 아니다.**
 *
 * 처음 판은 산출값을 받았고 그래서 `cohort` 가 `forum` 으로 앉았다 —
 * **승인받은 적 없는 사람이 화면에 `포럼회원` 으로 표시됐다.** 최박사가 기각하신 바로 그것이다:
 * *"포럼회원이라는 이름을 붙이는 순간 아닌 것을 그렇다고 말한 것이 된다."*
 * 실측으로 18명이 그 경우였다(`member_state`=`cohort` 인데 `memberships` 행이 없다).
 *
 * **`cohort` 는 권한이지 자격이 아니므로 tier 의 입력이 될 수 없다.**
 * 지금 세미나에 참여 중이라는 사실은 `cohortRoles` 가 말한다 — 축이 둘인 이유가 이것이다.
 *
 * | 저장값 | tier | underReview |
 * |---|---|---|
 * | `individual` | `forum` | false |
 * | `expired` | `suspended` | false |
 * | `pending` | `visitor` | false |
 * | `held` | `visitor` | **true** — tier 를 덮지 않는다 |
 * | (행 없음 · `null`) | `visitor` | false |
 *
 * **권한 판정은 무변경이다** — `member_state()` 산출 · `member_can_assess` · RLS · 진실표를
 * 이 함수는 읽지도 바꾸지도 않는다.
 *
 * **이 매핑은 저장소에 여기 한 곳뿐이다**(2026-08-29 전수 확인). 사본이 생기면 그때부터
 * 두 화면이 같은 사람을 다르게 부른다.
 */
export function toMembershipView(stored: MembershipStatus | null, cohortRoles: CohortRole[]): MembershipView {
  const tier: MemberTier =
    stored === 'individual' ? 'forum'
      : stored === 'expired' ? 'suspended'
        : 'visitor'; // pending · held · 행 없음
  return { tier, underReview: stored === 'held', cohortRoles };
}
