// ADR-205 — 실제 서버 페이지에 합성 봉투를 주입해 조회·표본 선택·채점·표시 연결을 확인한다.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps, ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Answers, MemberRef, ResponseEnvelope, Wave } from '@/contracts';

const mocks = vi.hoisted(() => ({ listResponses: vi.fn(), listCohortMembers: vi.fn() }));
vi.mock('@/app/_lib/requestScope', () => ({
  requestContext: async () => ({ listResponses: mocks.listResponses, listCohortMembers: mocks.listCohortMembers }),
  requestUser: async () => ({ id: 'coach-qa', role: 'coach' }),
  requestCohort: async () => ({ name: '합성 검증 회기' }),
}));
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NOT_FOUND'); },
  redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); },
}));
vi.mock('@/app/_screens/console/ConsoleTitle', () => ({ ConsoleTitle: () => <h1>그룹 리포트</h1> }));

import GroupReportPage from './page';
import { GroupDesign } from '@/instruments/futurenow/report/GroupDesign';
import { GroupComparison } from '@/instruments/futurenow/report/GroupComparison';
import { GroupView } from '@/instruments/futurenow/report/GroupView';
import { RecommendationList } from '@/instruments/futurenow/report/RecommendationList';

const COHORT = 'cohort-qa';
const A18 = '참여자 3명 미만의 평균이라 개인이 드러날 수 있습니다. 함께 보는 자료로 띄우지 마세요.';
const GENERIC = '개인을 특정하지 않고 그룹의 윤곽만 보여줍니다.';
type Envelope = ResponseEnvelope<Answers, unknown>;
let preRows: Envelope[];
let postRows: Envelope[];
let members: MemberRef[];

function envelope(id: string, userId: string, wave: Wave, createdAt: string, nav = 3, extra: Answers = {}): Envelope {
  return {
    id, userId, wave, createdAt, instrumentId: 'futurenow', cohortId: COHORT,
    subjectProfile: { gender: '여', birthYear: 1985 },
    answers: {
      NAV1: nav, NAV2: 3, NAV3: 3, NAV4: 3,
      A1: 3, A2: 3, A3: 3, A4: 3, A5: 3,
      C1: 3, C2: 3, C3: 3, C4: 3, C5: 3, C6: 3, C7: 3, C8: 3, C9: 3,
      D1: 3, D2: 3, D3: 3,
      B1: 5, B2: 5, B3: 5, B4: 5, B5: 5,
      E1: `바람-${id}`, E2: '', E3: '', ...extra,
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
const render = () => GroupReportPage({ params: Promise.resolve({ cohortId: COHORT }) });

beforeEach(() => {
  vi.clearAllMocks();
  preRows = [];
  postRows = [];
  members = [{ userId: 'member-1', name: '합성 참여자 1' }];
  // API 결과를 그대로 돌려 필터링을 페이지와 실제 helper가 수행하는지 확인한다.
  mocks.listResponses.mockImplementation(async ({ wave }: { wave: Wave }) => wave === 'pre' ? preRows : postRows);
  mocks.listCohortMembers.mockImplementation(async () => members);
});

describe('그룹 사후 페이지 — 현재 참여자·대응 표본·공개 동의', () => {
  it('전체 블록과 인쇄 인원을 현재 참여자로 제한하고 사후 시점의 사전으로 비교한다', async () => {
    members = [
      { userId: 'member-1', name: '합성 참여자 1' },
      { userId: 'member-2', name: '합성 참여자 2' },
      { userId: 'pending', name: '합성 미완료' },
    ];
    preRows = [
      envelope('future-pre', 'member-1', 'pre', '2026-11-03T00:00:00Z', 4),
      envelope('paired-pre', 'member-1', 'pre', '2026-09-21T00:00:00Z', 1),
      envelope('only-pre', 'member-2', 'pre', '2026-09-21T00:00:00Z', 2),
      envelope('moved-pre', 'moved', 'pre', '2026-09-21T00:00:00Z', 5),
      envelope('coach-pre', 'coach-qa', 'pre', '2026-09-21T00:00:00Z', 5),
    ];
    postRows = [
      envelope('latest-post', 'member-1', 'post', '2026-11-02T00:00:00Z', 5, { REC: '동의한 최신 글', REC_OK: true }),
      envelope('old-post', 'member-1', 'post', '2026-10-20T00:00:00Z', 4, { REC: '과거 글', REC_OK: true }),
      envelope('moved-post', 'moved', 'post', '2026-11-02T00:00:00Z', 1, { REC: '이전 회기 글', REC_OK: true }),
      envelope('coach-post', 'coach-qa', 'post', '2026-11-02T00:00:00Z', 1, { REC: '인도자 글', REC_OK: true }),
    ];
    const tree = await render();
    expect(mocks.listCohortMembers).toHaveBeenCalledExactlyOnceWith(COHORT, true, true);
    expect(mocks.listResponses).toHaveBeenCalledTimes(2);
    const design = ofType<ComponentProps<typeof GroupDesign>>(tree, GroupDesign)!.props;
    expect(design.members).toEqual(members);
    expect(design.done.map((member) => member.responseId).sort()).toEqual(['future-pre', 'only-pre']);
    expect(design.done.find((member) => member.userId === 'member-1')?.scores.compass.NAV1).toBe(4);
    const comparison = ofType<ComponentProps<typeof GroupComparison>>(tree, GroupComparison)!.props;
    expect(comparison.before.compass.NAV1).toBe(1);
    expect(comparison.after.compass.NAV1).toBe(5);
    expect(ofType(tree, GroupView)).toBeNull();
    expect(ofType<ComponentProps<typeof RecommendationList>>(tree, RecommendationList)?.props).toEqual({
      items: [{ text: '동의한 최신 글', attribution: '여·40대', createdAt: '2026-11-02T00:00:00Z' }], unconsentedCount: 0,
    });
    const html = renderToStaticMarkup(tree);
    expect(html).toContain('등록 3명 · 완료 2명');
    expect(html).toContain('사전 체크와 마무리 체크를 모두 마친 참여자 1명 기준입니다. 사전 체크를 마친 참여자는 2명입니다.');
    expect(html).toContain(A18);
    expect(html).not.toContain(GENERIC);
    expect(html).toContain('인도자 전용 화면입니다.');
    expect(html).not.toContain('과거 글');
    expect(html).not.toContain('이전 회기 글');
    expect(html).not.toContain('인도자 글');
    expect(html.indexOf('추천의 말 · 모집 안내용')).toBeGreaterThan(html.indexOf('함께 보는 자료 · 평균 지형'));
    const block = find<{ children: unknown }>(tree, (element) => element.type === 'section' &&
      ofType((element.props as { children?: unknown }).children, GroupComparison) !== null)!;
    const blockHtml = renderToStaticMarkup(block);
    expect(blockHtml.indexOf(A18)).toBeLessThan(blockHtml.indexOf('나침반 — 마음이 향하는 쪽'));
    expect(blockHtml).not.toContain('no-print');
    expect(blockHtml).not.toContain('준비도 단계 — 그룹 평균');
  });

  it('참여자 명단 조회 실패를 정상적인 빈 그룹으로 바꾸지 않는다', async () => {
    mocks.listCohortMembers.mockRejectedValueOnce(new Error('DIRECTORY_UNAVAILABLE'));
    await expect(render()).rejects.toThrow('DIRECTORY_UNAVAILABLE');
  });

  it.each([1, 2])('사후 짝이 없고 사전 %i명이면 기존 사전 평균과 인쇄 가능한 A18을 표시한다', async (count) => {
    members = Array.from({ length: count }, (_, index) => ({ userId: `member-${index + 1}`, name: `합성 ${index + 1}` }));
    preRows = members.map((member, index) => envelope(`pre-${index}`, member.userId, 'pre', '2026-09-21T00:00:00Z'));
    const tree = await render();
    expect(ofType<ComponentProps<typeof GroupView>>(tree, GroupView)?.props.all).toHaveLength(count);
    expect(ofType(tree, GroupComparison)).toBeNull();
    expect(ofType(tree, RecommendationList)).toBeNull();
    const block = find<{ children: unknown }>(tree, (element) => element.type === 'section' &&
      ofType((element.props as { children?: unknown }).children, GroupView) !== null)!;
    const html = renderToStaticMarkup(block);
    expect(html).toContain(A18);
    expect(html.indexOf(A18)).toBeLessThan(html.indexOf('준비도 단계 — 그룹 평균'));
    expect(html).not.toContain(GENERIC);
    expect(html).not.toContain('no-print');
    expect(html).not.toContain('사전 체크와 마무리 체크를 모두 마친');
  });

  it.each([2, 3])('대응 표본 %i명의 표본수로 경고를 결정하고 한 쌍의 평균만 표시한다', async (count) => {
    members = Array.from({ length: count }, (_, index) => ({ userId: `member-${index + 1}`, name: `합성 ${index + 1}` }));
    preRows = members.map((member, index) => envelope(`pre-${index}`, member.userId, 'pre', '2026-09-21T00:00:00Z', index + 1));
    postRows = members.map((member, index) => envelope(`post-${index}`, member.userId, 'post', '2026-11-02T00:00:00Z', index + 3));
    const tree = await render();
    const comparison = ofType<ComponentProps<typeof GroupComparison>>(tree, GroupComparison)!.props;
    expect(comparison.before.compass.NAV1).toBe((count + 1) / 2);
    expect(comparison.after.compass.NAV1).toBe((count + 1) / 2 + 2);
    expect(ofType(tree, GroupView)).toBeNull();
    const html = renderToStaticMarkup(tree);
    expect(html).toContain(`사전 체크와 마무리 체크를 모두 마친 참여자 ${count}명 기준입니다. 사전 체크를 마친 참여자는 ${count}명입니다.`);
    expect(html.includes(A18)).toBe(count < 3);
    expect(html.includes(GENERIC)).toBe(count >= 3);
  });

  it('평균 표본 0명은 빈 상태를 유지하고 경고와 비교 차트를 만들지 않는다', async () => {
    // 현재 참여자가 아닌 사람의 응답은 추천 블록까지 만들 수 없다.
    preRows = [envelope('moved-pre', 'moved', 'pre', '2026-09-21T00:00:00Z')];
    postRows = [envelope('moved-post', 'moved', 'post', '2026-11-02T00:00:00Z', 3, { REC: '이전 참여자의 글', REC_OK: true })];
    const tree = await render();
    const html = renderToStaticMarkup(tree);
    expect(html).toContain('아직 제출된 응답이 없어요.');
    expect(html).toContain('등록 1명 · 완료 0명');
    expect(html).not.toContain(A18);
    expect(ofType(tree, GroupView)).toBeNull();
    expect(ofType(tree, GroupComparison)).toBeNull();
    expect(ofType(tree, RecommendationList)).toBeNull();
  });

  it('사전 없는 사후의 추천은 표시하되 미동의 원문은 클라이언트 부품에 넘기지 않는다', async () => {
    members = [
      { userId: 'member-1', name: '합성 참여자 1' },
      { userId: 'member-2', name: '합성 참여자 2' },
    ];
    postRows = [
      envelope('public-post', 'member-1', 'post', '2026-11-02T00:00:00Z', 3, { REC: '  공개 동의한 원문  ', REC_OK: true }),
      envelope('private-post', 'member-2', 'post', '2026-11-02T01:00:00Z', 3, { REC: '공개하지 않은 비밀 원문', REC_OK: false }),
    ];
    const tree = await render();
    expect(ofType<ComponentProps<typeof RecommendationList>>(tree, RecommendationList)?.props).toEqual({
      items: [{ text: '  공개 동의한 원문  ', attribution: '여·40대', createdAt: '2026-11-02T00:00:00Z' }], unconsentedCount: 1,
    });
    expect(ofType(tree, GroupComparison)).toBeNull();
    expect(ofType(tree, GroupView)).toBeNull();
    const html = renderToStaticMarkup(tree);
    expect(html).toContain('아직 제출된 응답이 없어요.');
    expect(html).not.toContain(A18);
    expect(html).not.toContain(GENERIC);
    expect(html).not.toContain('공개하지 않은 비밀 원문');
    expect(html).toContain('동의하지 않은 글 1건은 싣지 않았습니다.');
  });
});
