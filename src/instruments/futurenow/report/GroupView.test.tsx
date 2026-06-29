import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GroupView } from './GroupView';
import { futurenowScoring } from '../scoring';

// 실제 채점 파이프라인으로 점수 생성(수기 FuturenowScores 조립 회피).
function answers(over: Record<string, unknown> = {}) {
  return {
    NAV1: 3, NAV2: 3, NAV3: 3, NAV4: 3,
    A1: 3, A2: 3, A3: 3, A4: 3, A5: 3,
    C1: 3, C2: 3, C3: 3, C4: 3, C5: 3, C6: 3, C7: 3, C8: 3, C9: 3,
    D1: 3, D2: 3, D3: 3,
    B1: 5, B2: 5, B3: 5, B4: 5, B5: 5,
    E1: '기대', E2: '정서',
    ...over,
  };
}
const score = (over: Record<string, unknown> = {}) => futurenowScoring.score(answers(over), { wave: 'pre' });

describe('GroupView (그룹 평균 — Step 3.3)', () => {
  it('빈 배열 → 안내(렌더 안전)', () => {
    expect(renderToStaticMarkup(<GroupView all={[]} />)).toContain('아직 응답이 없습니다');
  });

  it('n=1 → 깨지지 않고 렌더(참여자 1명, 평균=그 값)', () => {
    const html = renderToStaticMarkup(<GroupView all={[score()]} />);
    expect(html).toContain('참여자 1명');
    expect(html).toContain('준비도 단계');
    expect(html).toContain('다섯 영역의 간격');
  });

  it('n=2 → 참여자 2명 집계', () => {
    const html = renderToStaticMarkup(<GroupView all={[score(), score({ B1: 0, B2: 0 })]} />);
    expect(html).toContain('참여자 2명');
  });
});
