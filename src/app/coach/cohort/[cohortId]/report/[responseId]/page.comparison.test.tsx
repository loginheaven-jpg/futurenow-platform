// ADR-204 — 실제 서버 페이지를 호출하고 연결된 차트 블록을 렌더한다.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Answers, CoreContext, ResponseEnvelope, Wave } from '@/contracts';
import type { FuturenowScores } from '@/instruments/futurenow/scoring';

const mocks = vi.hoisted(() => ({
  getResponse: vi.fn(),
  listResponses: vi.fn(),
}));
vi.mock('@/app/_lib/requestScope', () => ({
  requestContext: async () => ({
    getResponse: mocks.getResponse,
    listResponses: mocks.listResponses,
    listCohortMembers: async () => [],
    getInterpretation: async () => null,
    getCohortMemberDetail: async () => null,
  }),
  requestUser: async () => ({ id: 'coach', role: 'coach' }),
  requestCohort: async () => ({ name: '검증 회기' }),
}));
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NOT_FOUND'); },
  redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); },
}));

import CoachReportPage from './page';
import { ReportPrintHeader } from './ReportPrintHeader';
import { ReportScreen } from '@/instruments/futurenow/report/ReportScreen';
import { WishPair } from '@/instruments/futurenow/report/WishPair';
import { TOOL } from '@/app/_vocab/tool';
import * as pairing from '@/app/_lib/pairedPre';

const COHORT = 'cohort-qa';
const USER = 'member-qa';
type Envelope = ResponseEnvelope<Answers, unknown>;
type ReportProps = { scores: FuturenowScores; prev?: FuturenowScores; wave: Wave };
let response: Envelope;
let preResponses: Envelope[];

function envelope(id: string, wave: Wave, createdAt: string, nav = 3): Envelope {
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

function find<P>(node: unknown, predicate: (element: ReactElement) => boolean): ReactElement<P> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = find<P>(child, predicate);
      if (found) return found;
    }
    return null;
  }
  if (!node || typeof node !== 'object') return null;
  const element = node as ReactElement<P> & { props?: { children?: unknown } };
  if (predicate(element)) return element;
  return find<P>(element.props?.children, predicate);
}

const ofType = <P,>(tree: unknown, type: unknown) => find<P>(tree, (element) => element.type === type);
const chartBlock = (tree: unknown) => find<{ className: string; children: unknown }>(tree, (element) =>
  (element.props as { className?: string }).className === 'report-charts-block',
)!;
const render = () => CoachReportPage({ params: Promise.resolve({ cohortId: COHORT, responseId: response.id }) });

beforeEach(() => {
  vi.clearAllMocks();
  response = envelope('post', 'post', '2026-11-02T00:00:00Z', 5);
  preResponses = [];
  mocks.getResponse.mockImplementation(async () => response);
  mocks.listResponses.mockImplementation(async (query: Parameters<CoreContext['listResponses']>[0]) =>
    preResponses.filter((candidate) =>
      candidate.instrumentId === query.instrumentId && candidate.cohortId === query.cohortId &&
      candidate.userId === query.userId && candidate.wave === query.wave,
    ),
  );
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('코치 개인 리포트 — 사전·사후 단독과 시점에 맞는 비교', () => {
  it('사전은 짝을 조회하지 않고 사전 단독 표제·차트를 그린다', async () => {
    response = envelope('pre', 'pre', '2026-09-21T00:00:00Z');
    const findPaired = vi.spyOn(pairing, 'findPairedPre');
    const tree = await render();
    expect(findPaired).not.toHaveBeenCalled();
    expect(mocks.listResponses).not.toHaveBeenCalled();
    expect(ofType<ReportProps>(tree, ReportScreen)?.props).toMatchObject({ wave: 'pre', prev: undefined });
    expect(ofType<{ waveLabel: string }>(tree, ReportPrintHeader)?.props.waveLabel).toBe(TOOL.pre);
    expect(ofType(tree, WishPair)).toBeNull();
    expect(renderToStaticMarkup(chartBlock(tree))).toContain('구간 게이지(사전 단독)');
  });

  it('짝 없는 사후는 사후 단독 표제·차트와 사후 E 라벨을 그린다', async () => {
    const findPaired = vi.spyOn(pairing, 'findPairedPre');
    const tree = await render();
    expect(findPaired).toHaveBeenCalledExactlyOnceWith(expect.anything(), response);
    expect(ofType<ReportProps>(tree, ReportScreen)?.props).toMatchObject({ wave: 'post', prev: undefined });
    expect(ofType<{ waveLabel: string }>(tree, ReportPrintHeader)?.props.waveLabel).toBe(TOOL.post);
    expect(ofType(tree, WishPair)).toBeNull();
    const html = renderToStaticMarkup(chartBlock(tree));
    expect(html).toContain('구간 게이지(사후 단독)');
    expect(html).toContain('그 바람은 지금');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('사후 시점의 짝을 차트·비교 표제·인쇄 차트 블록의 WishPair에 함께 연결한다', async () => {
    preResponses = [
      envelope('later-pre', 'pre', '2026-11-03T00:00:00Z', 4),
      envelope('paired-pre', 'pre', '2026-09-21T00:00:00Z', 1),
    ];
    const tree = await render();
    const chart = ofType<ReportProps>(tree, ReportScreen)!.props;
    expect(chart.wave).toBe('post');
    expect(chart.scores.compass.NAV1).toBe(5);
    expect(chart.prev?.compass.NAV1).toBe(1);
    expect(ofType<{ waveLabel: string }>(tree, ReportPrintHeader)?.props.waveLabel)
      .toBe(`${TOOL.pre} → ${TOOL.post}`);
    const block = chartBlock(tree);
    const wish = ofType<{ before: string; after: string }>(block, WishPair);
    expect(wish?.props).toEqual({ before: '바람-paired-pre', after: '바람-post' });
    const children = block.props.children as ReactElement[];
    expect(children[0].type).toBe(ReportScreen);
    expect(children[1].type).toBe(WishPair);
    const html = renderToStaticMarkup(block);
    expect(html).toContain('6주 전의 바람과 지금');
    expect(html).toContain('바람-paired-pre');
    expect(html).not.toContain('바람-later-pre');
  });

  it('짝 조회 실패는 사후 단독으로 표시하고 원문 없는 서버 로그를 남긴다', async () => {
    mocks.listResponses.mockRejectedValueOnce(new Error('비공개 응답이 포함될 수 있는 오류 본문'));
    const tree = await render();
    expect(ofType<ReportProps>(tree, ReportScreen)?.props).toMatchObject({ wave: 'post', prev: undefined });
    expect(ofType<{ waveLabel: string }>(tree, ReportPrintHeader)?.props.waveLabel).toBe(TOOL.post);
    expect(ofType(tree, WishPair)).toBeNull();
    expect(renderToStaticMarkup(chartBlock(tree))).toContain('구간 게이지(사후 단독)');
    expect(console.error).toHaveBeenCalledExactlyOnceWith('[coach-report] paired pre lookup failed', { responseId: response.id });
  });
});
