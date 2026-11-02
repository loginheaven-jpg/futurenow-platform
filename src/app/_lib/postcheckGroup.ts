// 그룹 사후 리포트의 응답 선택(ADR-205). 조회·채점·이름 조인은 페이지에서 한다.
import type { Answers, ResponseEnvelope } from '@/contracts';
import { attribution, type RecommendationItem } from '@/instruments/futurenow/report/groupModel';
import { compareResponseRecency, latestPerUser } from './latestPerUser';
import { selectPairedPre } from './pairedPre';

export type PostcheckPair<A, P> = {
  userId: string;
  pre: ResponseEnvelope<A, P>;
  post: ResponseEnvelope<A, P>;
};

export type PostcheckGroupSelection<A, P> = {
  /** 블록 0~4와 비교 0쌍 폴백에 쓸 최신 사전. 비교 짝의 원본 이력과 구별한다. */
  preRows: ResponseEnvelope<A, P>[];
  /** 현재 참여자마다 최신 대표 사후. 추천 동의도 이 응답에서만 판단한다. */
  postRows: ResponseEnvelope<A, P>[];
  pairedRows: PostcheckPair<A, P>[];
};

/** 현재 참여자 범위를 먼저 고정하고, 대표 사후의 짝은 전체 사전 이력에서 고른다. */
export function selectPostcheckGroup<A, P>({
  preRows,
  postRows,
  currentUserIds,
  instrumentId,
  cohortId,
}: {
  preRows: readonly ResponseEnvelope<A, P>[];
  postRows: readonly ResponseEnvelope<A, P>[];
  currentUserIds: Iterable<string>;
  instrumentId: string;
  cohortId: string;
}): PostcheckGroupSelection<A, P> {
  const allowed = new Set(currentUserIds);
  const inScope = (row: ResponseEnvelope<A, P>) =>
    row.instrumentId === instrumentId && row.cohortId === cohortId &&
    row.userId !== null && allowed.has(row.userId);
  const allPreRows = preRows.filter((row) => row.wave === 'pre' && inScope(row));
  const latestPosts = latestPerUser(postRows.filter((row) => row.wave === 'post' && inScope(row)));
  const pairedRows: PostcheckPair<A, P>[] = [];
  for (const post of latestPosts) {
    const pre = selectPairedPre(allPreRows, post);
    if (pre) pairedRows.push({ userId: post.userId!, pre, post });
  }
  return { preRows: latestPerUser(allPreRows), postRows: latestPosts, pairedRows };
}

/**
 * selectPostcheckGroup 의 현재 참여자 postRows 를 받는다.
 * 최신 응답을 먼저 정하므로 과거 동의 글을 되살리지 않는다. 카드·복사·인쇄에는 이 목록만 넘긴다.
 * 미동의 원문·프로필·신원은 반환하지 않고, 비어 있지 않은 미동의 글의 수만 센다.
 */
export function collectRecommendations(postRows: readonly ResponseEnvelope<Answers, unknown>[]): {
  items: RecommendationItem[];
  unconsentedCount: number;
} {
  const latestPosts = latestPerUser(postRows.filter((row) => row.wave === 'post' && row.userId !== null));
  const items: RecommendationItem[] = [];
  let unconsentedCount = 0;
  for (const row of latestPosts.sort(compareResponseRecency)) {
    const text = row.answers.REC;
    if (typeof text !== 'string' || !text.trim()) continue;
    if (row.answers.REC_OK !== true) {
      unconsentedCount += 1;
      continue;
    }
    items.push({ text, attribution: attribution(row.subjectProfile, row.createdAt), createdAt: row.createdAt });
  }
  return { items, unconsentedCount };
}
