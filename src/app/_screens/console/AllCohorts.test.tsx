import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AllCohorts } from './AllCohorts';
import type { CohortSummary } from '../types';
import { TOOL } from '@/app/_vocab/tool';

const cohorts: CohortSummary[] = [
  { id: 'c1', name: '봄 1기', instrumentLabel: TOOL.productLabel, responded: 3, total: 5, careCount: 1, code: 'RSTUV' },
  { id: 'c2', name: '청년부 2기', instrumentLabel: TOOL.productLabel, responded: 12, total: 12, careCount: 0, code: 'KMNPQ' },
];
const noop = () => {};

describe('AllCohorts (모든 회기 — Step 3.2)', () => {
  it('목록: 회기 카드(이름) + 헤더 액션 슬롯 전달, 빈 상태 아님', () => {
    const html = renderToStaticMarkup(
      <AllCohorts cohorts={cohorts} onNewCohort={noop} />,
    );
    // **제목은 껍데기가 든다**(U-3) — `screenChrome` 표의 `/coach/cohorts` 가 정본이고
    //   `tests/screenChrome.test.ts` 가 그것을 잠근다. 여기서는 **본문**만 잰다.
    expect(html, '화면이 헤더를 그리면 두 겹이 된다').not.toContain('<header');
    expect(html).toContain('봄 1기');
    expect(html).toContain('청년부 2기');

    expect(html).not.toContain('아직 만든 회기가 없어요');
    // **홈 아이콘 단언은 껍데기로 옮겼다**(U-3) — `ConsoleShell.test.tsx` 가 잰다.
    //   화면은 본문만 그리므로 여기서 재면 «화면이 헤더를 그린다» 는 뜻이 된다.
  });

  it('빈 상태: 회기 0 → 안내 + 새 회기 버튼', () => {
    const html = renderToStaticMarkup(<AllCohorts cohorts={[]} onNewCohort={noop} />);
    expect(html).toContain('아직 만든 회기가 없어요');
    expect(html).toContain('새 회기');
  });

  it('미리보기 안전: headerActions 미전달 시 액션 0', () => {
    const html = renderToStaticMarkup(<AllCohorts cohorts={cohorts} />);
    expect(html).not.toContain('HDR_ACT');
  });
});
