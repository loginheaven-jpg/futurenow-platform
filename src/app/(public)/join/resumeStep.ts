// 재진입 딥링크 판정 — **순수 함수** (U-8).
//
// `loginOutcome`·`safeReturn`·`rosterModel` 과 같은 관용구다: 판정을 떼어 내야 잠금이 닿는다.
//
// **가르는 것은 `null` 의 뜻 둘이다.** `getCohortMeta(cohortId)` 가 `null` 을 내는 경우는 둘인데
//   전에는 하나로만 읽었다:
//     ⑴ 로그인은 했는데 **그 회기 사람이 아니다** → 코드 입력으로(옳은 폴백)
//     ⑵ **아직 로그인을 안 했다**(RLS 가 막는다) → 로그인으로 보내야 한다
//   둘을 안 가르면 ⑵ 가 ⑴ 의 폴백으로 떨어져 **딥링크가 조용히 끊긴다.**
//   마무리 체크 안내는 **카톡으로 온다** — 받는 사람이 로그인돼 있을 이유가 없다.
export type ResumeStep = 'start' | 'code' | 'auth';

export function resumeStep(input: { hasMeta: boolean; signedIn: boolean }): ResumeStep {
  if (input.hasMeta) return 'start'; // 이미 그 회기 사람 — 코드·미리보기를 건너뛴다
  return input.signedIn ? 'code' : 'auth';
}
