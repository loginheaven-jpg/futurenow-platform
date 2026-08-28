// 차수 홈 진행 표시(ADR-102 축3). 순수 — 단위테스트 대상.
//
// 왜: 투자한 사람은 자기 기록이 쌓이는 것을 본다. 그것이 다음 회차를 열게 만든다.
//   지금까지 화면은 '이번 주'만 말했고 7주 전체를 한 번도 보여 주지 않았다.
//
// 규율 셋:
//   · 회차 수를 **7 로 박지 않는다.** `cohort_sessions` 행 수에서 읽는다 — 5주·6주 편성을 팔 때 깨진다.
//   · 일정이 없으면 그리지 않는다(칸 0개짜리 빈 줄은 정보가 아니다).
//   · **판정·색을 두지 않는다.** 채움과 비움의 차이만 보이면 된다. 빈 칸에 경고색을 쓰지 않는다 —
//     ADR-81 의 시각 위계 3단에 넷째가 끼는 것이라 강조하면 accent CTA 가 밀린다.
import type { CohortSession } from '@/contracts';

export type Progress = {
  /** 회차 수 — cohort_sessions 행 수. 7 이 아닐 수 있다. */
  total: number;
  /** 제출한 회차 수. */
  done: number;
  /** 회차 번호 오름차순으로 채움/비움. 화면은 이 순서대로 그린다. */
  cells: boolean[];
};

/**
 * 진행 표시 자료. `submitted` 는 제출한 회차 번호 집합이다.
 *
 * **제출만 채움으로 센다.** '작성 중'을 채움으로 세면 다 쓰지 않고도 칸이 차 보이고,
 * 그러면 이 표시가 돌아올 이유를 없앤다(ADR-91 B 가 세운 목적과 반대가 된다).
 */
export function buildProgress(sessions: CohortSession[], submitted: ReadonlySet<number>): Progress | null {
  if (sessions.length === 0) return null; // 일정 미등록 — 그리지 않는다
  const ordered = [...sessions].sort((a, b) => a.sessionNo - b.sessionNo);
  const cells = ordered.map((s) => submitted.has(s.sessionNo));
  return { total: cells.length, done: cells.filter(Boolean).length, cells };
}

/**
 * 제출 여부를 물어볼 회차 — **이미 열린 회차만.**
 * 미래 회차는 카드 라우트가 진입 자체를 막으므로 제출이 있을 수 없다. 헛되이 왕복하지 않는다.
 */
export function openedSessionNos(sessions: CohortSession[], now: number): number[] {
  return sessions
    .filter((s) => new Date(s.opensAt).getTime() <= now)
    .map((s) => s.sessionNo)
    .sort((a, b) => a - b);
}
