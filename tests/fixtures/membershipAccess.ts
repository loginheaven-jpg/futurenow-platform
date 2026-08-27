// 회원 상태 진실표 — **하나의 픽스처, 두 구현**(S-1 단계 4 · ADR-122).
//
// 이 저장소가 반복해서 데인 실패는 "사본이 둘"이다(ADR-112 CARE_TONE · ADR-114 활력 임계 ·
//   ADR-119 문안 드리프트). 회원 상태에서 그 사본이 생길 자리는 정확히 하나다 —
//   **응시 가부**를 SQL(`member_can_assess`)과 화면(표시 매핑)이 각자 알고 있게 되는 순간이다.
//   둘이 갈리는 날 화면과 서버 강제가 다른 답을 낸다.
//
// 그래서 규칙을 **데이터로 한 번만** 적고 두 구현이 이 표를 향해 검증받는다.
//   ① SQL  — tests/rls.integration.test.ts 가 실DB 에서 `member_can_assess` 를 이 표와 대조
//   ② 화면 — 단계 5에서 앱 레이어 순수 함수가 생기면 같은 표로 대조(자리는 아래 §참고에 적어 둔다)
//
// **이 표는 런타임 코드가 아니다.** 앱이 이것을 import 해 판정하면 그 순간 사본이 셋이 된다.
//   판정은 `member_state()` 하나이고, 이 파일은 그 판정을 **재는 자**다.

/** 응시 계열. 여정 = 사전·사후 체크, 상시 = 가치 카드·그림자·사랑의 언어. */
export type AccessKind = 'journey' | 'standing';

export interface AccessRow {
  state: string;
  journey: boolean;
  standing: boolean;
  /** 왜 그런가 — 실패 메시지에 실려 원인을 바로 읽게 한다. */
  why: string;
}

/**
 * 상태 × 계열 → 응시 가부.
 *
 * **열람은 이 표에 없다.** 자기가 응시한 결과는 상태와 무관하게 언제나 본인에게 열린다
 *   (메모 §2-가 · IA v2.1 §5.4). 상태가 가르는 것은 **새 응시 하나**다.
 *   여기 열람 열이 생기면 그 확정이 무너지는 것이므로, 없는 것이 곧 규율이다.
 */
export const ACCESS_TABLE: readonly AccessRow[] = [
  { state: 'cohort',     journey: true,  standing: true,  why: '차수 회원 — 여정 + 상시' },
  { state: 'individual', journey: false, standing: true,  why: '개인 회원 — 상시만' },
  { state: 'pending',    journey: false, standing: false, why: '승인 대기 — 응시 ✕(열람은 ○)' },
  { state: 'expired',    journey: false, standing: false, why: '만료 — 응시 ✕(열람은 ○)' },
  { state: 'held',       journey: false, standing: false, why: '보류 — 운영자 판단' },
];

export const ACCESS_KINDS: readonly AccessKind[] = ['journey', 'standing'];

/** 표를 (state, kind) 로 조회. 표에 없는 상태를 묻는 것 자체가 결함이므로 던진다. */
export function expectedAccess(state: string, kind: AccessKind): boolean {
  const row = ACCESS_TABLE.find((r) => r.state === state);
  if (!row) throw new Error(`진실표에 없는 상태: ${state}`);
  return kind === 'journey' ? row.journey : row.standing;
}

/**
 * 우선순위 진실표 — `member_state()` 가 무엇을 무엇보다 앞세우는가.
 * 각 행은 "이런 상황이면 이 상태가 나와야 한다"이고, 실DB 에서 그대로 재현해 확인한다.
 */
export interface PriorityCase {
  label: string;
  /** 세미나 차수(kind='seminar' AND status='active')에 등록되어 있는가 */
  seminarEnrolled: boolean;
  /** memberships 행의 status. null = 행 없음 */
  stored: 'pending' | 'individual' | 'expired' | 'held' | null;
  /** individual 일 때 valid_until 이 지났는가 */
  expiredDate?: boolean;
  expect: string;
  why: string;
}

export const PRIORITY_CASES: readonly PriorityCase[] = [
  { label: '세미나 등록 · 행 없음', seminarEnrolled: true, stored: null, expect: 'cohort',
    why: 'cohort 는 산출이다 — 저장 행이 없어도 나온다' },
  { label: '세미나 등록 · held', seminarEnrolled: true, stored: 'held', expect: 'held',
    why: 'held 가 cohort 를 이긴다 — 이기지 않으면 차수 등록만으로 보류가 무력화된다' },
  { label: '세미나 등록 · individual', seminarEnrolled: true, stored: 'individual', expect: 'cohort',
    why: 'cohort 가 저장값을 이긴다 — 기수 안에 있는 동안은 차수 회원이다' },
  { label: '세미나 등록 · pending', seminarEnrolled: true, stored: 'pending', expect: 'cohort',
    why: '위와 같다 — 코드 가입이 곧 자격이다' },
  { label: '미등록 · 행 없음', seminarEnrolled: false, stored: null, expect: 'pending',
    why: '기본값. 아직 아무 자격이 없는 것이 사실이다' },
  { label: '미등록 · individual(기간 유효)', seminarEnrolled: false, stored: 'individual', expiredDate: false, expect: 'individual',
    why: 'valid_until 이 남았거나 NULL 이면 유효' },
  { label: '미등록 · individual(기간 지남)', seminarEnrolled: false, stored: 'individual', expiredDate: true, expect: 'expired',
    why: '만료는 **산출한다** — 이 저장소에 크론이 없어 저장값만 보면 자격이 영원히 산다' },
  { label: '미등록 · expired(저장)', seminarEnrolled: false, stored: 'expired', expect: 'expired',
    why: '운영자가 손으로 끊은 경우' },
  { label: '미등록 · held', seminarEnrolled: false, stored: 'held', expect: 'held', why: '운영자 판단' },
];

// ── 참고 — 단계 5에서 물릴 자리 ───────────────────────────────────────────────
// 앱 레이어에 표시용 순수 함수(예: `assessmentAccess(state, kind)`)가 생기면 그 단위테스트가
//   ACCESS_TABLE 을 전수 순회해 대조한다. 그 파일을 만들 때 이 주석을 지우고 테스트를 건다.
//   **새 표를 만들지 않는다** — 표가 둘이 되는 순간 이 픽스처의 목적이 사라진다.
