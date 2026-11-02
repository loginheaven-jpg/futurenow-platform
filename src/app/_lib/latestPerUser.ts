// 응답 dedup — 재진단 허용(최신 유효, 최박사 확정)에 따라 user별 created_at 최신 1건만 남긴다.
// 진단-1A: 그룹 평균 오염 방지(같은 사람 N번 반영 → 1번) + 개인 리포트 재방문 staleness 방지(무순서 [0] → 최신).
// 앱층 순수 함수(계약 아님). created_at, 동률이면 id 큰 쪽으로 결정한다(ADR-204).
// DB 의 ISO UTC 문자열을 그대로 비교해 소수초 정밀도를 보존한다. Date 변환으로 밀리초 아래를 버리지 않는다.
// userId=null(비실명 응답)은 접지 않고 각각 보존 — null끼리 한 사람으로 오인 금지.
import type { ResponseEnvelope } from '@/contracts';

/** 대표 응답과 사전 짝 선택이 같은 최신 기준을 쓴다. 양수이면 a 가 더 최신이다(시각 동률은 id). */
export function compareResponseRecency(
  a: Pick<ResponseEnvelope, 'createdAt' | 'id'>,
  b: Pick<ResponseEnvelope, 'createdAt' | 'id'>,
): number {
  if (a.createdAt !== b.createdAt) return a.createdAt > b.createdAt ? 1 : -1;
  return a.id === b.id ? 0 : a.id > b.id ? 1 : -1;
}

export function latestPerUser<A, P>(envelopes: ResponseEnvelope<A, P>[]): ResponseEnvelope<A, P>[] {
  const latest = new Map<string, ResponseEnvelope<A, P>>();
  const anonymous: ResponseEnvelope<A, P>[] = [];
  for (const e of envelopes) {
    if (e.userId === null) {
      anonymous.push(e); // 실명 없는 응답은 서로 다른 사람일 수 있어 접지 않는다
      continue;
    }
    const prev = latest.get(e.userId);
    if (!prev || compareResponseRecency(e, prev) > 0) latest.set(e.userId, e);
  }
  return [...latest.values(), ...anonymous];
}
