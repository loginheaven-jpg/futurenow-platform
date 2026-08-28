// 전체 메뉴 시트의 **회차 칩 상태 판정** — 순수 (4차 F-3 · 시안 E `.sess-chip`).
//
// **부품은 계산하지 않는다**(F-1 강조 ①). `SessionChipStrip` 은 `state` 를 받아 그릴 뿐이고,
//   무엇이 완료·진행·열림·잠금인지는 여기서 정한다. `buildProgress` 와 같은 계열의 순수 함수다.
//
// **잠긴 회차를 감추지 않는다**(시안 E 의 약속 — *"여정의 전체 길이가 보여야 한다"*).
//   그래서 잠긴 회차도 칩을 만든다. 다만 **링크는 주지 않는다** — 갈 수 없는 곳으로 보내지 않는다.
import type { CohortSession } from '@/contracts';
import type { SessionChip } from '@/app/_screens/site/SessionChipStrip';

/**
 * 회차 칩 목록.
 *
 * - `done`    제출을 마쳤다
 * - `current` 지금 열려 있고 아직 제출하지 않았다 — **한 칸뿐이다**
 * - `open`    열렸으나 현재 회차가 아니다(지난 회차 — 다시 열어 볼 수 있다)
 * - `locked`  아직 열리지 않았다
 *
 * **회차 수를 6 으로 박지 않는다** — `cohort_sessions` 행 수에서 읽는다(`buildProgress` 와 같은 규율).
 * 5주·6주 편성을 팔 때 깨진다.
 */
export function buildSessionChips(input: {
  cohortId: string;
  sessions: CohortSession[];
  /** 제출을 마친 회차 번호. */
  submitted: ReadonlySet<number>;
  /** 지금 열린 회차(없으면 null). `my_cohorts` 가 이미 판정해 준 값을 그대로 쓴다. */
  openSessionNo: number | null;
  /** 열림 판정 기준 시각. **인자로 받는다** — 함수 안에서 `Date.now()` 를 부르면 테스트가 시계를 못 잡는다. */
  now: number;
}): SessionChip[] {
  const { cohortId, sessions, submitted, openSessionNo, now } = input;
  return [...sessions]
    .sort((a, b) => a.sessionNo - b.sessionNo)
    .map((s) => {
      const no = s.sessionNo;
      const opened = new Date(s.opensAt).getTime() <= now;
      const href = `/my/cohorts/${cohortId}/checkin/${no}`;
      if (submitted.has(no)) return { no, state: 'done', href };
      if (!opened) return { no, state: 'locked' }; // 링크 없음 — 카드 라우트가 어차피 막는다
      return { no, state: no === openSessionNo ? 'current' : 'open', href };
    });
}
