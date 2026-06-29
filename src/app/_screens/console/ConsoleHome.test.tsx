import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConsoleHome } from './ConsoleHome';
import type { CohortSummary, RosterMember } from '../types';

const cohorts: CohortSummary[] = [
  { id: 'c1', name: '봄 1기', instrumentLabel: '퓨처나우 사전', responded: 3, total: 5, careCount: 1, code: 'RSTUV' },
];
const care: RosterMember[] = [{ id: 'm1', name: '이참여', status: 'care', note: '안부' }];

describe('ConsoleHome (코치 콘솔 셸 — Step 3.1)', () => {
  it('헤더 액션 슬롯 전달(로그아웃·내 정보 자리) + 제목·코치명', () => {
    const html = renderToStaticMarkup(
      <ConsoleHome coachName="김코치" careMembers={care} cohorts={cohorts} headerActions={<span>HDR_ACT</span>} />,
    );
    expect(html).toContain('코치 콘솔');
    expect(html).toContain('김코치');
    expect(html).toContain('HDR_ACT'); // AppHeader action 슬롯으로 전달됨
  });

  it('headerActions 미전달 시 액션 렌더 0(미리보기 안전)', () => {
    const html = renderToStaticMarkup(<ConsoleHome coachName="김코치" careMembers={care} cohorts={cohorts} />);
    expect(html).not.toContain('HDR_ACT');
  });
});
