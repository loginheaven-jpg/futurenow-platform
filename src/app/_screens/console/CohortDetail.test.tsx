import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CohortDetail } from './CohortDetail';
import type { CohortSummary, RosterMember } from '../types';

const cohort: CohortSummary = {
  id: 'co1',
  name: '봄 1기',
  instrumentLabel: '퓨처나우 진단',
  responded: 1,
  total: 2,
  careCount: 0,
  code: 'QKN2H',
};
const roster: RosterMember[] = [{ id: 'r1', userId: 'u1', name: '이응답', status: 'done' }];
const noop = () => {};

describe('CohortDetail [그룹 리포트] 진입 (Step 3.3)', () => {
  it('onGroupReport 전달 시 [그룹 리포트 보기] 노출', () => {
    const html = renderToStaticMarkup(<CohortDetail cohort={cohort} roster={roster} onGroupReport={noop} />);
    expect(html).toContain('그룹 리포트 보기');
  });

  it('미전달 시(미리보기) 그룹 리포트 진입 0', () => {
    const html = renderToStaticMarkup(<CohortDetail cohort={cohort} roster={roster} />);
    expect(html).not.toContain('그룹 리포트 보기');
  });
});

describe('CohortDetail 참여자 휴지통 (ADR-73)', () => {
  it('canManageMembers 시 명단 행에 삭제(휴지통) 어포던스 노출', () => {
    const html = renderToStaticMarkup(<CohortDetail cohort={cohort} roster={roster} canManageMembers onRemoveMember={noop} />);
    expect(html).toContain('차수에서 제거'); // aria-label/title
  });

  it('미전달(운영자/소유코치 아님) 시 휴지통 미노출', () => {
    const html = renderToStaticMarkup(<CohortDetail cohort={cohort} roster={roster} />);
    expect(html).not.toContain('차수에서 제거');
  });
});
