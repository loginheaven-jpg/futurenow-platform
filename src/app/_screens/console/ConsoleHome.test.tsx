import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConsoleHome } from './ConsoleHome';
import type { CohortSummary, RosterMember } from '../types';

const cohorts: CohortSummary[] = [
  { id: 'c1', name: '봄 1기', instrumentLabel: '퓨처나우 사전', responded: 3, total: 5, careCount: 1, code: 'RSTUV' },
];
const care: RosterMember[] = [{ id: 'm1', userId: 'u1', name: '이참여', status: 'care', note: '안부' }];

describe('ConsoleHome (인도자 콘솔 셸 — Step 3.1)', () => {
  // **헤더 단언은 껍데기로 옮겼다**(U-3). 제목 `콘솔` 은 `screenChrome` 표가 들고
  //   로그아웃·내 정보는 `ConsoleShell` 이 `HeaderActions` 로 그린다.
  it('**화면이 헤더를 그리지 않는다** — 껍데기가 그린다', () => {
    expect(renderToStaticMarkup(<ConsoleHome coachName="김코치" careMembers={[]} cohorts={[]} />))
      .not.toContain('<header');
  });

  it('headerActions 미전달 시 액션 렌더 0(미리보기 안전)', () => {
    const html = renderToStaticMarkup(<ConsoleHome coachName="김코치" careMembers={care} cohorts={cohorts} />);
    expect(html).not.toContain('HDR_ACT');
  });

  it('운영자 승인 대기 배너 — pendingCoachApps>0 이면 본부 유도(A3 로그인 알림)', () => {
    const html = renderToStaticMarkup(<ConsoleHome coachName="김코치" careMembers={care} cohorts={cohorts} pendingCoachApps={2} />);
    expect(html).toContain('승인 대기 2건');
    expect(html).toContain('본부에서 확인');
  });

  it('pendingCoachApps=0(기본) 이면 배너 없음', () => {
    const html = renderToStaticMarkup(<ConsoleHome coachName="김코치" careMembers={care} cohorts={cohorts} />);
    expect(html).not.toContain('본부에서 확인');
  });

  it('회기 0건 — 진행 중 회기 빈 상태 안내(A6)', () => {
    const html = renderToStaticMarkup(<ConsoleHome coachName="김코치" careMembers={[]} cohorts={[]} />);
    expect(html).toContain('아직 개설한 회기가 없어요');
  });
});
