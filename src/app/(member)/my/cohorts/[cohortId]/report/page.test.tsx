// 내 리포트(ADR-204) — 실제 페이지를 호출해 차트·거울·짝 패널이 같은 응답을 읽는지 검사한다.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Answers, CoreContext, ResponseEnvelope, Wave } from '@/contracts';
import type { FuturenowScores } from '@/instruments/futurenow/scoring';

const mocks = vi.hoisted(() => ({
  listResponses: vi.fn(),
  listMyCohorts: vi.fn(),
  requestUser: vi.fn(),
}));
vi.mock('@/app/_lib/requestScope', () => ({
  requestContext: async () => ({ listResponses: mocks.listResponses, listMyCohorts: mocks.listMyCohorts }),
  requestUser: mocks.requestUser,
}));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); },
}));

import MyReportPage from './page';
import { CompassDumbbell, GapRadar } from '@/instruments/futurenow/report/visuals';
import { WishPair } from '@/instruments/futurenow/report/WishPair';
import { MirrorView } from '@/app/_screens/MirrorView';
import { participantMirror } from '@/instruments/futurenow/participantMirror';
import { futurenowScoring } from '@/instruments/futurenow/scoring';
import * as pairedPre from '@/app/_lib/pairedPre';

const COHORT = 'co1';
const USER = 'u1';
type Envelope = ResponseEnvelope<Answers, unknown>;
let responses: Envelope[];
let preFailure: Error | null;
let postFailure: Error | null;

function env(id: string, wave: Wave, createdAt: string, nav = 3): Envelope {
  return {
    id, wave, createdAt, instrumentId: 'futurenow', cohortId: COHORT, userId: USER, subjectProfile: {},
    answers: {
      NAV1: nav, NAV2: 3, NAV3: 3, NAV4: 3,
      A1: 3, A2: 3, A3: 3, A4: 3, A5: 3,
      C1: 3, C2: 3, C3: 3, C4: 3, C5: 3, C6: 3, C7: 3, C8: 3, C9: 3,
      D1: 3, D2: 3, D3: 3,
      B1: 5, B2: 5, B3: 5, B4: 5, B5: 5,
      E1: `바람-${id}`, E2: `변화-${id}`, E3: `이어갈 것-${id}`,
    },
  };
}

function findAll<P>(node: unknown, type: unknown): ReactElement<P>[] {
  if (Array.isArray(node)) return node.flatMap((child) => findAll<P>(child, type));
  if (!node || typeof node !== 'object') return [];
  const element = node as ReactElement<P> & { props?: { children?: unknown } };
  const own = element.type === type ? [element] : [];
  return [...own, ...findAll<P>(element.props?.children, type)];
}

const render = () => MyReportPage({ params: Promise.resolve({ cohortId: COHORT }) });
const chart = (tree: unknown) => findAll<{ scores: FuturenowScores; prev?: FuturenowScores }>(tree, CompassDumbbell)[0];

beforeEach(() => {
  responses = [];
  preFailure = null;
  postFailure = null;
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.requestUser.mockResolvedValue({ id: USER, name: '검증 참여자', role: 'user' });
  mocks.listMyCohorts.mockResolvedValue([{ cohortId: COHORT, name: '검증 회기' }]);
  mocks.listResponses.mockImplementation(async (query: Parameters<CoreContext['listResponses']>[0]) => {
    if (query.wave === 'pre' && preFailure) throw preFailure;
    if (query.wave === 'post' && postFailure) throw postFailure;
    return responses.filter((response) =>
      response.instrumentId === query.instrumentId && response.cohortId === query.cohortId &&
      response.userId === query.userId && response.wave === query.wave,
    );
  });
});
afterEach(() => vi.restoreAllMocks());

describe('내 리포트 — 대표 사후와 그 시점의 사전', () => {
  it('최신 사후를 먼저 고르고 뒤늦은 사전 재제출 대신 이전 짝을 차트·거울·WishPair 에 함께 쓴다', async () => {
    const before = env('paired-pre', 'pre', '2026-08-01T00:00:00Z', 1);
    const after = env('late-pre', 'pre', '2026-08-12T00:00:00Z', 4);
    const latestPost = env('post-z', 'post', '2026-08-10T00:00:00Z', 5);
    responses = [
      after, env('post-a', 'post', latestPost.createdAt, 2), before,
      env('older-post', 'post', '2026-08-09T00:00:00Z'), latestPost,
    ];
    const findPaired = vi.spyOn(pairedPre, 'findPairedPre');
    const scoring = vi.spyOn(futurenowScoring, 'score');
    const tree = await render();
    const current = chart(tree).props;
    expect(findPaired).toHaveBeenCalledExactlyOnceWith(expect.anything(), latestPost);
    expect(current.scores.compass.NAV1).toBe(5);
    expect(current.prev?.compass.NAV1).toBe(1);
    const gap = findAll<typeof current>(tree, GapRadar)[0].props;
    expect(gap.scores).toBe(current.scores);
    expect(gap.prev).toBe(current.prev);
    expect(findAll<{ before: string; after: string }>(tree, WishPair)[0].props).toEqual({
      before: '바람-paired-pre', after: '바람-post-z',
    });
    expect(findAll<{ mirror: unknown }>(tree, MirrorView).map((element) => element.props.mirror)).toEqual([
      participantMirror(current.prev!), participantMirror(current.scores),
    ]);
    expect(scoring).toHaveBeenCalledTimes(2);
    expect(scoring).toHaveBeenCalledWith(before.answers, { wave: 'pre' });
    expect(scoring).toHaveBeenCalledWith(latestPost.answers, { wave: 'post' });
    const html = renderToStaticMarkup(tree);
    expect(html).toContain('그 바람은 지금');
    expect(html).toContain('달라진 것 하나');
    expect(html).toContain('붙잡을 하나');
    expect(html).not.toContain('바람-late-pre');
    expect(html).not.toContain('바람-post-a');
    expect(mocks.listResponses).toHaveBeenCalledWith({ instrumentId: 'futurenow', cohortId: COHORT, userId: USER, wave: 'pre' });
  });

  it('사후가 없으면 최신 사전을 단독 표시하고 사전 E 라벨을 유지한다', async () => {
    responses = [
      env('old-pre', 'pre', '2026-08-01T00:00:00Z', 1),
      env('new-pre', 'pre', '2026-08-05T00:00:00Z', 4),
    ];
    const tree = await render();
    expect(chart(tree).props.scores.compass.NAV1).toBe(4);
    expect(chart(tree).props.prev).toBeUndefined();
    expect(findAll(tree, WishPair)).toHaveLength(0);
    const html = renderToStaticMarkup(tree);
    expect(html).toContain('바람-new-pre');
    expect(html).toContain('기대');
    expect(html).toContain('정서');
    expect(html).toContain('요청');
    expect(html).not.toContain('그 바람은 지금');
  });

  it('사전이 사후 뒤에만 있으면 사후 단독이며 미래 사전·짝 패널을 넣지 않는다', async () => {
    responses = [
      env('post', 'post', '2026-08-10T00:00:00Z', 5),
      env('late-pre', 'pre', '2026-08-12T00:00:00Z', 1),
    ];
    const tree = await render();
    expect(chart(tree).props.scores.compass.NAV1).toBe(5);
    expect(chart(tree).props.prev).toBeUndefined();
    expect(findAll(tree, WishPair)).toHaveLength(0);
    expect(findAll(tree, MirrorView)).toHaveLength(1);
    const html = renderToStaticMarkup(tree);
    expect(html).toContain('달라진 것 하나');
    expect(html).not.toContain('바람-late-pre');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('짝 조회 실패는 사후 단독·식별자 로그이고 다음 열람에서 다시 짝을 읽는다', async () => {
    responses = [
      env('pre', 'pre', '2026-08-01T00:00:00Z'),
      env('post', 'post', '2026-08-10T00:00:00Z'),
    ];
    preFailure = new Error('원문이 포함될 수 있는 오류 상세');
    const failedTree = await render();
    expect(chart(failedTree).props.prev).toBeUndefined();
    expect(findAll(failedTree, WishPair)).toHaveLength(0);
    expect(console.error).toHaveBeenCalledExactlyOnceWith('[my-report] paired pre lookup failed', {
      cohortId: COHORT, responseId: 'post',
    });
    preFailure = null;
    const recoveredTree = await render();
    expect(chart(recoveredTree).props.prev).toBeDefined();
    expect(findAll(recoveredTree, WishPair)).toHaveLength(1);
    expect(mocks.listResponses).toHaveBeenCalledTimes(4);
  });

  it('사후 조회 자체가 실패하면 사전만 보여 주지 않고 기존 오류 처리를 유지한다', async () => {
    responses = [env('pre', 'pre', '2026-08-01T00:00:00Z', 4)];
    postFailure = new Error('post unavailable');
    await expect(render()).rejects.toBe(postFailure);
    expect(mocks.listResponses).toHaveBeenCalledExactlyOnceWith({
      instrumentId: 'futurenow', cohortId: COHORT, userId: USER, wave: 'post',
    });
  });

  it('조회 실패로 기록을 확인할 수 없으면 결과가 없다고 표시하지 않는다', async () => {
    postFailure = new Error('post unavailable');
    await expect(render()).rejects.toBe(postFailure);
    postFailure = null;
    preFailure = new Error('pre unavailable');
    await expect(render()).rejects.toBe(preFailure);
  });

  it('두 wave 조회가 정상이고 응답이 없을 때만 기존 빈 상태를 표시한다', async () => {
    const tree = await render();
    expect(findAll(tree, CompassDumbbell)).toHaveLength(0);
    expect(renderToStaticMarkup(tree)).toContain('아직 체크 결과가 없어요.');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('비로그인은 응답 조회 전에 로그인으로 보낸다', async () => {
    mocks.requestUser.mockResolvedValue(null);
    await expect(render()).rejects.toThrow('REDIRECT:/login');
    expect(mocks.listResponses).not.toHaveBeenCalled();
  });
});
