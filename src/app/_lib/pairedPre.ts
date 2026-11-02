// 사후 기록의 사전 짝 — 개인·내 리포트·그룹·AI 가 같은 규칙을 쓴다(ADR-204).
// 전체 사전 이력에서 고른다. 최신 사전을 먼저 접으면 사후 뒤의 재제출이 이전의 유효한 짝을 지워 버린다.
import type { CoreContext, ResponseEnvelope } from '@/contracts';
import { compareResponseRecency } from './latestPerUser';

function hasPairScope(post: ResponseEnvelope): post is ResponseEnvelope & {
  wave: 'post'; cohortId: string; userId: string;
} {
  return post.wave === 'post' && !!post.instrumentId && !!post.cohortId && !!post.userId;
}

/** 같은 진단·회기·사람의 pre 중 대상 post 시각 이하에서 최신 1건. 입력과 봉투는 변경하지 않는다. */
export function selectPairedPre<A, P>(
  preEnvelopes: readonly ResponseEnvelope<A, P>[],
  post: ResponseEnvelope,
): ResponseEnvelope<A, P> | null {
  if (!hasPairScope(post)) return null;
  let selected: ResponseEnvelope<A, P> | null = null;
  for (const candidate of preEnvelopes) {
    if (
      candidate.wave !== 'pre' ||
      candidate.instrumentId !== post.instrumentId ||
      candidate.cohortId !== post.cohortId ||
      candidate.userId !== post.userId ||
      candidate.createdAt > post.createdAt
    ) continue;
    if (!selected || compareResponseRecency(candidate, selected) > 0) selected = candidate;
  }
  return selected;
}

/** 읽기만 하는 래퍼. 정상적인 짝 부재만 null 이며, 조회 실패는 호출부로 그대로 전파한다. */
export async function findPairedPre<A, P>(
  ctx: Pick<CoreContext, 'listResponses'>,
  post: ResponseEnvelope<A, P>,
): Promise<ResponseEnvelope<A, P> | null> {
  if (!hasPairScope(post)) return null;
  const preEnvelopes = await ctx.listResponses<A, P>({
    instrumentId: post.instrumentId,
    cohortId: post.cohortId,
    userId: post.userId,
    wave: 'pre',
  });
  return selectPairedPre(preEnvelopes, post);
}
