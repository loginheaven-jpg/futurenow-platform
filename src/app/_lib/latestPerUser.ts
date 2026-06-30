// 응답 dedup — 재진단 허용(최신 유효, 최박사 확정)에 따라 user별 created_at 최신 1건만 남긴다.
// 진단-1A: 그룹 평균 오염 방지(같은 사람 N번 반영 → 1번) + 개인 리포트 재방문 staleness 방지(무순서 [0] → 최신).
// 앱층 순수 함수(계약 아님). 입력 순서 무관 — 명시적 created_at 비교. 비교 관행은 rosterModel.ts와 동일(ISO UTC 문자열 비교).
// userId=null(비실명 응답)은 접지 않고 각각 보존 — null끼리 한 사람으로 오인 금지.
import type { ResponseEnvelope } from '@/contracts';

export function latestPerUser<A, P>(envelopes: ResponseEnvelope<A, P>[]): ResponseEnvelope<A, P>[] {
  const latest = new Map<string, ResponseEnvelope<A, P>>();
  const anonymous: ResponseEnvelope<A, P>[] = [];
  for (const e of envelopes) {
    if (e.userId === null) {
      anonymous.push(e); // 실명 없는 응답은 서로 다른 사람일 수 있어 접지 않는다
      continue;
    }
    const prev = latest.get(e.userId);
    if (!prev || e.createdAt > prev.createdAt) latest.set(e.userId, e); // 최신(동률이면 먼저 만난 1건 유지)
  }
  return [...latest.values(), ...anonymous];
}
