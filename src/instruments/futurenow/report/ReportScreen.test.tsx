import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReportScreen } from './ReportScreen';
import type { FuturenowScores } from '../scoring';

// 코치 개인 리포트 라우트의 최종 렌더 경로(getResponse→score→ReportScreen) 스모크.
const scores: FuturenowScores = {
  vitality: { score: 15, low: false },
  redFlag: { triggered: false, byVitality: false, byCareCheck: false },
  grow: { G: 3, R: 3, O: 3, W: 3, F: 3, faithAux: { F1: null, F2: null } },
  trap: { D1: 2, D2: 1, D3: 1, primary: 'D1' },
  compass: { NAV1: 3, NAV2: 4, NAV3: 2, NAV4: 3 },
  gap: { B1: 5, B2: 6, B3: 4, B4: 7, B5: 5 },
  faith: { F1: null, F2: null },
  subjective: { E1: '한 문장 성찰', E2: '', E3: '' },
};

describe('ReportScreen (개인 리포트 — 코치 라우트 렌더 경로)', () => {
  it('scores 로 핵심 패널과 주관식을 렌더한다', () => {
    const html = renderToStaticMarkup(<ReportScreen scores={scores} />);
    expect(html).toContain('활력의 이동');
    expect(html).toContain('나침반');
    expect(html).toContain('준비도');
    expect(html).toContain('한 문장 성찰'); // 주관식 통과
    expect(html.length).toBeGreaterThan(200);
  });
});
