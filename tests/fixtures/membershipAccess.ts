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
 *
 * **다만 2026-08-30 이후 `expired` 하나가 예외다**(최박사 정의 — *탈퇴에 준하는 처리*).
 *   `expired` 는 **회기 콘텐츠**(피드·기수 목록·기수 단건)에서도 막힌다.
 *   `responses`·`checkins` 의 본인 열람(`user_id = auth.uid()`)은 **그대로 열려 있다** —
 *   손대지 않았다. 즉 *열람은 상태와 무관하다* 는 확정은 **자기 응답에 대해서는 유효**하고,
 *   `expired` 가 잃는 것은 **기수라는 방에 들어가는 것**이다.
 *   이 표는 여전히 **응시 가부**만 담는다 — 그 구분이 흐려지면 표가 두 가지를 재게 된다.
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
 *
 * **우선순위가 2026-08-30 에 한 칸 바뀐다**(마이그레이션 `20260830090000`):
 *   옛: `held > cohort > 저장 > pending` · 만료는 `valid_until` 로 **산출**
 *   새: `held > **expired** > cohort > 저장 > pending` · 만료 **산출 폐지**
 *
 * 아래 표는 **새 판정 기준**으로 적혀 있다. 그러나 **적용 전에도 레드로 두지 않는다** —
 * 두 행에 `needsMigration` 을 달아 소비자가 원장을 보고 **건너뛰고 사유를 출력**한다.
 *
 * **레드를 정상이라 부르지 않는다.** 그것은 위험한 말버릇이고, 적용이 늦어지면
 * 그 레드가 **다른 레드를 가린다** — *원래 빨간 거야* 가 되는 순간 진짜 결함이 들어와도 안 보인다.
 * 스킵 메시지는 계속 출력되므로 **잊히지도 않는다**(*기다림에는 끝이 있어야 한다* 의 세 조건과 맞물린다 —
 * 조건으로 끝나고, 상한이 있고, 넘기면 시끄럽다).
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
  /**
   * **이 기댓값이 성립하려면 적용돼 있어야 하는 마이그레이션 버전.**
   *
   * 표는 새 기준으로 앞서 있어도 되지만 **테스트가 레드로 서 있으면 안 된다** —
   * 레드가 오래 서 있으면 *원래 빨간 거야* 가 되고, 그때 **진짜 결함이 들어와도 아무도 못 본다.**
   * 그래서 소비자가 원장을 보고 **건너뛰되 사유를 시끄럽게 출력**한다
   * (`tests/membership.integration.test.ts`).
   */
  needsMigration?: string;
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
  // **자동 만료 폐지 후 이 행의 기댓값이 뒤집힌다**(마이그레이션 `20260830090000` · 최박사 확정).
  //   옛 판정은 `individual` + 지난 `valid_until` 을 `expired` 로 **산출**했고 그것이
  //   *최박사가 지정하신 승급을 시간으로 푸는* 유일한 경로였다. 이제 보지 않는다.
  //   **적용 전에는 이 행이 레드가 되는 것이 정상이다** — 표가 코드보다 앞서 있다.
  { label: '미등록 · individual(기간 지남)', seminarEnrolled: false, stored: 'individual', expiredDate: true, expect: 'individual',
    needsMigration: '20260830090000',
    why: '**자동 만료 폐지**(2026-08-30) — 판정이 valid_until 을 보지 않는다. 지정한 승급은 시간으로 풀리지 않는다' },
  { label: '미등록 · expired(저장)', seminarEnrolled: false, stored: 'expired', expect: 'expired',
    why: '운영자가 손으로 끊은 경우' },
  { label: '미등록 · held', seminarEnrolled: false, stored: 'held', expect: 'held', why: '운영자 판단' },

  // ── 순서 변경이 만드는 새 조합(2026-08-30 · 지휘부 지적) ─────────────────────
  //   `expired` 를 `cohort` **앞**에 두는 변경은 이 조합 하나에서만 산출을 바꾼다.
  //   **해당자 0명이라 지금은 실해가 없으나**, 그 사실이 곧 *잴 필요가 없다* 는 뜻이 아니다 —
  //   지금 넣지 않으면 다음 사람이 순서를 되돌려도 아무것도 울지 않는다.
  { label: '**세미나 등록 · expired(저장)**', seminarEnrolled: true, stored: 'expired', expect: 'expired',
    needsMigration: '20260830090000',
    why: 'expired 가 cohort 를 이긴다 — expired 는 탈퇴에 준하는 처리라, 지면 기수 등록만으로 탈퇴가 무력화된다(held 를 앞에 둔 것과 같은 근거)' },
];

// ── 참고 — 단계 5에서 물릴 자리 ───────────────────────────────────────────────
// 앱 레이어에 표시용 순수 함수(예: `assessmentAccess(state, kind)`)가 생기면 그 단위테스트가
//   ACCESS_TABLE 을 전수 순회해 대조한다. 그 파일을 만들 때 이 주석을 지우고 테스트를 건다.
//   **새 표를 만들지 않는다** — 표가 둘이 되는 순간 이 픽스처의 목적이 사라진다.
