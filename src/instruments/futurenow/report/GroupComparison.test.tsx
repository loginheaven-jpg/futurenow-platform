import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AverageScores } from './groupModel';
import { GroupComparison } from './GroupComparison';

const before: AverageScores = {
  vitality: { score: 8 },
  compass: { NAV1: 1, NAV2: 2, NAV3: 3, NAV4: 4 },
  gap: { B1: 2, B2: 3, B3: 4, B4: 5, B5: 6 },
  grow: { G: 1, R: 2, O: 3, W: 4, F: 5 },
};
const after: AverageScores = {
  vitality: { score: 61 / 3 },
  compass: { NAV1: 2, NAV2: 3, NAV3: 4, NAV4: 5 },
  gap: { B1: 3, B2: 4, B3: 5, B4: 6, B5: 7 },
  grow: { G: 5, R: 4, O: 3, W: 2, F: 1 },
};

describe('GroupComparison (ADR-205)', () => {
  it('나침반·간격 비교와 숫자 활력 평균만 표시한다', () => {
    const html = renderToStaticMarkup(<GroupComparison before={before} after={after} />);
    expect(html).toContain('나침반 — 마음이 향하는 쪽');
    expect(html).toContain('다섯 영역의 간격');
    expect(html).toContain('다섯 영역의 간격 레이더');
    expect(html).toContain('2 → 3');
    expect(html).toContain('6 → 7');
    expect(html).toContain('활력 평균 · 사전 8.0 → 사후 20.3');
    expect(html.match(/<h3 /g)).toHaveLength(2);
  });

  it('낮거나 높은 평균에도 개인 돌봄·구간·함정·준비도 카드를 만들지 않는다', () => {
    const html = renderToStaticMarkup(<GroupComparison before={before} after={after} />);
    for (const text of ['시들음', '번성', '돌봄', '개별 안부', '구간 게이지', '주 함정', '준비도', 'GROW', '숨은 층', '나에게 묻는 시간']) {
      expect(html).not.toContain(text);
    }
  });
});
