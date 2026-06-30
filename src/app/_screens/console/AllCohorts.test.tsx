import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AllCohorts } from './AllCohorts';
import type { CohortSummary } from '../types';

const cohorts: CohortSummary[] = [
  { id: 'c1', name: '봄 1기', instrumentLabel: '퓨처나우 진단', responded: 3, total: 5, careCount: 1, code: 'RSTUV' },
  { id: 'c2', name: '청년부 2기', instrumentLabel: '퓨처나우 진단', responded: 12, total: 12, careCount: 0, code: 'KMNPQ' },
];
const noop = () => {};

describe('AllCohorts (모든 차수 — Step 3.2)', () => {
  it('목록: 차수 카드(이름) + 헤더 액션 슬롯 전달, 빈 상태 아님', () => {
    const html = renderToStaticMarkup(
      <AllCohorts cohorts={cohorts} headerActions={<span>HDR_ACT</span>} onNewCohort={noop} />,
    );
    expect(html).toContain('모든 차수');
    expect(html).toContain('봄 1기');
    expect(html).toContain('청년부 2기');
    expect(html).toContain('HDR_ACT'); // AppHeader action 슬롯
    expect(html).not.toContain('아직 만든 차수가 없어요');
    // X2b: sub 모드 — 우측 홈 아이콘(항상 홈 복귀) 노출
    expect(html).toContain('aria-label="홈"');
  });

  it('빈 상태: 차수 0 → 안내 + 새 차수 버튼', () => {
    const html = renderToStaticMarkup(<AllCohorts cohorts={[]} onNewCohort={noop} />);
    expect(html).toContain('아직 만든 차수가 없어요');
    expect(html).toContain('새 차수');
  });

  it('미리보기 안전: headerActions 미전달 시 액션 0', () => {
    const html = renderToStaticMarkup(<AllCohorts cohorts={cohorts} />);
    expect(html).not.toContain('HDR_ACT');
  });
});
