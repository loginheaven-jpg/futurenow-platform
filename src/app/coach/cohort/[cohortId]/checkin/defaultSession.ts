// 회차 현황의 기본 선택 회차(ADR-94 §4-1). 순수 — 단위테스트 대상.
//
// 왜: 기본이 `sessions[0]`(=1회차)이라 인도자가 8/9 에 콘솔을 열면 **1회차를 보면서 3회차를 준비**하게 된다.
//   회차가 늘수록 어긋남이 커지고, 매번 탭을 눌러 고치는 것은 도구가 사람을 시키는 일이다.
//
// 규칙: ① 지금 열려 있는 회차 ② 없으면 마지막으로 마감된 회차 ③ 둘 다 없으면 첫 회차.
//   ①에서 **회차 번호가 가장 큰 것**을 고른다 — 현재 일정은 창이 겹치지 않지만(마감 23:59 → 다음 개시 00:00),
//   일정 편집 화면이 임의 날짜를 허용하므로 겹칠 수 있다. 겹치면 뒤엣것이 지금 준비하는 회차다.
//   ②는 마감 직후(예: 마감 23:59 와 다음 개시 00:00 사이)와 전 회차 종료 후를 함께 덮는다.
import type { CohortSession } from '@/contracts';

export function defaultSessionNo(sessions: CohortSession[], now: number = Date.now()): number {
  if (sessions.length === 0) return 1;

  const open = sessions.filter((s) => {
    const o = new Date(s.opensAt).getTime();
    const c = new Date(s.closesAt).getTime();
    return Number.isFinite(o) && Number.isFinite(c) && now >= o && now <= c;
  });
  if (open.length > 0) return Math.max(...open.map((s) => s.sessionNo));

  const closed = sessions.filter((s) => {
    const c = new Date(s.closesAt).getTime();
    return Number.isFinite(c) && c < now;
  });
  if (closed.length > 0) return Math.max(...closed.map((s) => s.sessionNo));

  return sessions[0]?.sessionNo ?? 1; // 아직 아무 회차도 열리지 않았다(개설 직후)
}
