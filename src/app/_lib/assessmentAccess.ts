// 응시 가부 **표시 매핑**(S-1 단계 5 · ADR-122).
//
// **이것은 판정이 아니다.** 판정은 `member_state()` SQL 한 곳이고, 강제는 응시 시작 RPC 안의
//   `member_can_assess` 다. 여기 있는 것은 이미 나온 상태를 화면이 어떻게 그릴지 정하는 매핑이다.
//   화면에서 버튼을 감추는 것은 안전장치가 아니다(발주서 §4.4) — 감추기 전에 서버가 이미 막는다.
//
// **픽스처를 import 하지 않는다.** `tests/fixtures/membershipAccess.ts` 는 **재는 자**이고
//   앱이 그것을 읽어 판정하면 사본이 셋이 된다. 대신 테스트가 이 함수와 픽스처를 대조한다 —
//   둘이 갈리는 날 테스트가 먼저 레드가 된다. 사본이 생길 자리가 정확히 여기다.
import type { AssessmentKind, MemberState } from '@/contracts/domain';

export function assessmentAccess(state: MemberState, kind: AssessmentKind): boolean {
  if (state === 'cohort') return true; // 여정 + 상시
  if (state === 'individual') return kind === 'standing'; // 상시만
  return false; // pending · expired · held — 응시 ✕ (열람은 상태와 무관하게 ○)
}
