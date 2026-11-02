// ADR-207 — 실제 서버 페이지에서 마무리 진행과 전체 관리 명단의 범위를 따로 검증한다.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps, ReactElement } from 'react';
import type { Answers, Cohort, Enrollment, MemberRef, ResponseEnvelope, Wave } from '@/contracts';

const mocks = vi.hoisted(() => ({
  requestUser: vi.fn(), requestCohort: vi.fn(), listEnrollments: vi.fn(), listResponses: vi.fn(),
  listAlerts: vi.fn(), listCohortMembers: vi.fn(), listAllCohorts: vi.fn(),
}));
vi.mock('@/app/_lib/requestScope', () => ({
  requestContext: async () => mocks, requestUser: mocks.requestUser, requestCohort: mocks.requestCohort,
}));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); },
  notFound: () => { throw new Error('NOT_FOUND'); },
}));
vi.mock('./CohortDetailClient', () => ({ CohortDetailClient: () => null }));
vi.mock('./FeedSummary', () => ({ FeedSummary: () => null }));

import CohortDetailPage from './page';
import { CohortDetailClient } from './CohortDetailClient';

const COHORT = 'cohort-qa';
const cohort: Cohort = {
  id: COHORT, coachId: 'coach', instrumentId: 'futurenow', name: '합성 회기', description: null,
  code: 'qa-code', status: 'active', maxMembers: 20, expiresAt: null, postOpenedAt: '2026-11-01T00:00:00Z',
};
let enrollments: Enrollment[];
let members: MemberRef[];
let participants: MemberRef[];
let responses: ResponseEnvelope<Answers, unknown>[];

function response(id: string, userId: string | null, wave: Wave): ResponseEnvelope<Answers, unknown> {
  return {
    id, userId, wave, instrumentId: 'futurenow', cohortId: COHORT, createdAt: '2026-11-02T00:00:00Z', subjectProfile: {},
    answers: {
      NAV1: 3, NAV2: 3, NAV3: 3, NAV4: 3,
      A1: 3, A2: 3, A3: 3, A4: 3, A5: 3,
      C1: 3, C2: 3, C3: 3, C4: 3, C5: 3, C6: 3, C7: 3, C8: 3, C9: 3,
      D1: 3, D2: 3, D3: 3, B1: 5, B2: 5, B3: 5, B4: 5, B5: 5, E1: '', E2: '',
    },
  };
}

function findClient(node: unknown): ReactElement<ComponentProps<typeof CohortDetailClient>> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findClient(child);
      if (found) return found;
    }
    return null;
  }
  if (!node || typeof node !== 'object') return null;
  const element = node as ReactElement<{ children?: unknown }>;
  if (element.type === CohortDetailClient) return element as ReactElement<ComponentProps<typeof CohortDetailClient>>;
  return findClient(element.props?.children);
}
const render = () => CohortDetailPage({ params: Promise.resolve({ cohortId: COHORT }), searchParams: Promise.resolve({}) });

beforeEach(() => {
  vi.clearAllMocks();
  members = [
    { userId: 'done', name: '합성 완료 참여자' },
    { userId: 'pending', name: '합성 미완료 참여자' },
    { userId: 'unnamed', name: null },
    { userId: 'coach', name: '합성 인도자' },
    { userId: 'admin', name: '합성 운영자' },
  ];
  participants = members.slice(0, 3);
  enrollments = members.map(({ userId }) => ({ cohortId: COHORT, userId, joinedAt: '2026-09-01T00:00:00Z' }));
  responses = [
    response('done-post-1', 'done', 'post'), response('done-post-2', 'done', 'post'),
    response('pending-pre', 'pending', 'pre'), response('coach-post', 'coach', 'post'),
    response('admin-post', 'admin', 'post'), response('removed-post', 'removed', 'post'),
    response('anonymous-post', null, 'post'),
  ];
  mocks.requestUser.mockResolvedValue({ id: 'coach', role: 'coach' });
  mocks.requestCohort.mockResolvedValue(cohort);
  mocks.listEnrollments.mockImplementation(async () => enrollments);
  mocks.listResponses.mockImplementation(async () => responses);
  mocks.listAlerts.mockResolvedValue([]);
  mocks.listAllCohorts.mockResolvedValue([]);
  mocks.listCohortMembers.mockImplementation(async (_cohortId: string, participantsOnly?: boolean) => participantsOnly ? participants : members);
});

describe('회기 상세 마무리 진행 — 현재 일반 참여자만', () => {
  it.each(['coach', 'admin'])('%s 열람에서도 진행만 일반 참여자로 세고 전체 명단·삭제 영향 수는 보존한다', async (role) => {
    mocks.requestUser.mockResolvedValue({ id: role, role });
    const props = findClient(await render())!.props;
    expect(mocks.listCohortMembers).toHaveBeenCalledWith(COHORT);
    expect(mocks.listCohortMembers).toHaveBeenCalledWith(COHORT, true);
    expect(mocks.listCohortMembers).toHaveBeenCalledTimes(2);
    expect(props.postStatus).toEqual({ done: 1, total: 3, pending: ['합성 미완료 참여자', '참여자'] });
    expect(props.roster.map((member) => member.userId).sort()).toEqual(['admin', 'coach', 'done', 'pending', 'unnamed']);
    expect(props.summary).toMatchObject({ responded: 4, total: 5 });
    expect(props.memberCount).toBe(5);
    expect(props.responseCount).toBe(7);
  });

  it('등록 제거된 사람의 남은 사후 응답은 완료·미완료·분모 어디에도 들어가지 않는다', async () => {
    enrollments = enrollments.filter((entry) => entry.userId !== 'done');
    members = members.filter((member) => member.userId !== 'done');
    participants = participants.filter((member) => member.userId !== 'done');
    const props = findClient(await render())!.props;
    expect(props.postStatus).toEqual({ done: 0, total: 2, pending: ['합성 미완료 참여자', '참여자'] });
    expect(props.memberCount).toBe(4);
    expect(props.responseCount).toBe(7);
  });

  it('일반 참여자가 없으면 진행은 0명이고 관리용 전체 명단은 남는다', async () => {
    participants = [];
    const props = findClient(await render())!.props;
    expect(props.postStatus).toEqual({ done: 0, total: 0, pending: [] });
    expect(props.roster).toHaveLength(5);
    expect(props.memberCount).toBe(5);
  });

  it('현재 참여자 명단 조회 오류를 정상 0명으로 삼키지 않는다', async () => {
    const failure = new Error('PARTICIPANT_DIRECTORY_UNAVAILABLE');
    mocks.listCohortMembers.mockImplementation(async (_cohortId: string, participantsOnly?: boolean) => {
      if (participantsOnly) throw failure;
      return members;
    });
    await expect(render()).rejects.toBe(failure);
  });

  it.each([
    { user: null, destination: '/login' },
    { user: { id: 'member', role: 'user' }, destination: '/home' },
  ])('기존 접근 게이트가 명단 조회보다 먼저다 — $destination', async ({ user, destination }) => {
    mocks.requestUser.mockResolvedValue(user);
    await expect(render()).rejects.toThrow(`REDIRECT:${destination}`);
    expect(mocks.listCohortMembers).not.toHaveBeenCalled();
    expect(mocks.listResponses).not.toHaveBeenCalled();
  });
});
