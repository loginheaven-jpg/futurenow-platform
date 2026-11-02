// ADR-207 — 마감 뒤 열린 마무리는 유지하고 사전·가치 카드·자격 매핑은 그대로 둔다.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import type { MemberState, MyCohortSummary } from '@/contracts';

const mocks = vi.hoisted(() => ({
  requestUser: vi.fn(), getMyMemberState: vi.fn(), listMyCohorts: vi.fn(), getMyValueAssessment: vi.fn(),
}));
vi.mock('@/app/_lib/requestScope', () => ({ requestContext: async () => mocks, requestUser: mocks.requestUser }));
vi.mock('next/navigation', () => ({ redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); } }));

import AssessmentsPage from './page';
import { AssessmentsScreen, type AssessmentsScreenProps } from './AssessmentsScreen';
import { postJoinHref } from '@/app/_vocab/postNudge';

let cohorts: MyCohortSummary[];
let state: MemberState;
function cohort(id: string, overrides: Partial<MyCohortSummary> = {}): MyCohortSummary {
  return {
    cohortId: id, name: `합성 ${id}`, coachName: '합성 인도자', status: 'active', preDone: false,
    postDone: false, postOpened: false, openSessionNo: null, openSessionSubmitted: false,
    openSessionHasContent: false, joinedAt: '2026-09-01T00:00:00Z', ...overrides,
  };
}
async function items() {
  const tree = await AssessmentsPage() as ReactElement<AssessmentsScreenProps>;
  expect(tree.type).toBe(AssessmentsScreen);
  return Object.fromEntries(tree.props.sections.flatMap((section) => section.items).map((item) => [item.key, item]));
}

beforeEach(() => {
  vi.clearAllMocks();
  cohorts = [];
  state = 'cohort';
  mocks.requestUser.mockResolvedValue({ id: 'member', role: 'user' });
  mocks.getMyMemberState.mockImplementation(async () => state);
  mocks.listMyCohorts.mockImplementation(async () => cohorts);
  mocks.getMyValueAssessment.mockResolvedValue(null);
});

describe('체크 허브 — 마감 뒤 열린 마무리 진입', () => {
  it('마감·개시·미완료이면 pending 회원 상태에서도 시작과 공용 사후 주소를 제공한다', async () => {
    state = 'pending';
    cohorts = [cohort('archived', { status: 'archived', postOpened: true })];
    const result = await items();
    expect(result.post).toMatchObject({ status: '시작', href: postJoinHref('archived'), note: '합성 archived · 지금 하실 수 있어요.' });
    expect(result.pre.href).toBeUndefined();
    expect(result.pre.status).toBeUndefined();
    expect(result.value.href).toBeUndefined();
    expect(result.value.status).toBe('대기');
  });

  it('마감했어도 아직 개시하지 않은 마무리는 대기이며 주소를 만들지 않는다', async () => {
    cohorts = [cohort('archived', { status: 'archived', postOpened: false })];
    const result = await items();
    expect(result.post.status).toBe('대기');
    expect(result.post.href).toBeUndefined();
    expect(result.post.note).toBe('6회차를 마친 뒤 열립니다.');
  });

  it('완료한 사후는 후보에서 제외하고 다음 개시·미완료 회기를 선택한다', async () => {
    cohorts = [
      cohort('done', { status: 'archived', postOpened: true, postDone: true }),
      cohort('pending', { postOpened: true }),
    ];
    expect((await items()).post.href).toBe(postJoinHref('pending'));
    cohorts = [cohorts[0]];
    expect((await items()).post.href).toBeUndefined();
  });

  it('활성 여부로 다시 정렬하지 않고 listMyCohorts 의 기존 순서를 따른다', async () => {
    const archived = cohort('archived', { status: 'archived', postOpened: true });
    const active = cohort('active', { postOpened: true });
    cohorts = [archived, active];
    expect((await items()).post.href).toBe(postJoinHref('archived'));
    cohorts = [active, archived];
    expect((await items()).post.href).toBe(postJoinHref('active'));
  });

  it('사전은 미완료 활성 회기, 가치 카드는 첫 활성 회기를 계속 사용한다', async () => {
    cohorts = [
      cohort('archived', { status: 'archived', postOpened: true }),
      cohort('active-done', { preDone: true }),
      cohort('active-pending'),
    ];
    const result = await items();
    expect(result.pre).toMatchObject({ status: '시작', href: '/join?cohort=active-pending' });
    expect(result.value).toMatchObject({ status: '시작', href: '/my/cohorts/active-done/values' });
    expect(mocks.getMyValueAssessment).toHaveBeenCalledExactlyOnceWith('active-done');
    expect(result.post.href).toBe(postJoinHref('archived'));
  });

  it('활성 회기 없는 포럼회원의 가치 카드는 기존 개인 경로이고 사전 자격은 넓히지 않는다', async () => {
    state = 'individual';
    cohorts = [cohort('archived', { status: 'archived', postOpened: true })];
    const result = await items();
    expect(result.value.href).toBe('/my/values');
    expect(mocks.getMyValueAssessment).toHaveBeenCalledExactlyOnceWith(null);
    expect(result.pre.href).toBeUndefined();
    expect(result.pre.note).toBe('회기에 속하면 열립니다.');
  });

  it('비로그인은 회기와 회원 상태를 읽기 전에 로그인으로 보낸다', async () => {
    mocks.requestUser.mockResolvedValue(null);
    await expect(items()).rejects.toThrow('REDIRECT:/login');
    expect(mocks.listMyCohorts).not.toHaveBeenCalled();
    expect(mocks.getMyMemberState).not.toHaveBeenCalled();
  });
});
