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

  // ADR-77 §5.1 — 2면 인도자 전용 패널(함정·믿음) 렌더
  it('인도자 전용 패널: 주 함정 라벨 + 믿음(무응답) + 전용 헤더', () => {
    const html = renderToStaticMarkup(<ReportScreen scores={scores} />);
    expect(html).toContain('인도자 전용 · 참여자에게 보이지 않습니다');
    expect(html).toContain('관성'); // trap.primary=D1 → 관성
    expect(html).toContain('무응답'); // faith F1·F2 null
    expect(html).toContain('의미'); // FAITH_LABELS.F1
    expect(html).toContain('실행'); // FAITH_LABELS.F2
  });

  it('믿음 응답 시 값 표시(무응답 아님)', () => {
    const answered: FuturenowScores = { ...scores, faith: { F1: 5, F2: 2 } };
    const html = renderToStaticMarkup(<ReportScreen scores={answered} />);
    const panel = html.slice(html.indexOf('믿음의 자리'));
    expect(panel).not.toContain('무응답');
  });

  // §5.3(부분) — 인도자 패널은 주관식(종합) 다음에 온다
  it('배치: 인도자 패널이 주관식 뒤', () => {
    const html = renderToStaticMarkup(<ReportScreen scores={scores} />);
    expect(html.indexOf('숨은 층')).toBeGreaterThan(html.indexOf('한 문장 성찰'));
  });
});
