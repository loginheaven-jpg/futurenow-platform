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

  // ── ORDER report_cards_v1 §4 인수 기준 ──────────────────────────────
  const varied: FuturenowScores = { ...scores, grow: { G: 2, R: 4, O: 2.5, W: 3, F: 2, faithAux: { F1: null, F2: null } } };
  // 배지는 <span style="…">G</span> 형태다. 글자 → 스타일로 뒤집어 본다.
  const badges = (html: string) => {
    const out: Record<string, string> = {};
    for (const m of html.matchAll(/<span style="([^"]*)"[^>]*>([GROWF])<\/span>/g)) out[m[2]] = m[1];
    return out;
  };

  it('§4-1 아래 행이 준비도(좌) · 간격(우) — 가이드 해석 순서', () => {
    const html = renderToStaticMarkup(<ReportScreen scores={scores} />);
    expect(html.indexOf('나침반')).toBeLessThan(html.indexOf('준비도 (GROW+F)'));
    expect(html.indexOf('준비도 (GROW+F)')).toBeLessThan(html.indexOf('다섯 영역의 간격'));
  });

  it('§4-2 다섯 축에 G·R·O·W·F 배지가 항목명 왼쪽에 순서대로', () => {
    const html = renderToStaticMarkup(<ReportScreen scores={varied} />);
    const order = ['G', 'R', 'O', 'W', 'F'];
    const at = order.map((k) => html.indexOf(`>${k}</span>`));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
    // 배지가 항목명보다 앞이다(같은 행 안에서 왼쪽).
    for (const [k, label] of [['G', '조감도'], ['R', '현실인식'], ['O', '원씽'], ['W', '피드백'], ['F', '정체성']]) {
      expect(html.indexOf(`>${k}</span>`)).toBeLessThan(html.indexOf(label));
    }
  });

  it('§4-3 최고점 축이 지렛대색 — 배지와 막대 둘 다', () => {
    const html = renderToStaticMarkup(<ReportScreen scores={varied} />); // R=4 단독 최고
    const b = badges(html);
    expect(b.R).toContain('var(--color-success)');
    for (const k of ['G', 'O', 'W']) expect(b[k]).toContain('var(--color-primary)');
    // 막대도 같은 색(지렛대 축의 fill).
    const growCard = html.slice(html.indexOf('준비도 (GROW+F)'), html.indexOf('다섯 영역의 간격'));
    expect(growCard).toContain('width:80%;background:var(--color-success)'); // R=4 → 80%
  });

  it('§4-3 동점이면 복수 축이 지렛대', () => {
    const tie: FuturenowScores = { ...scores, grow: { G: 4, R: 4, O: 2, W: 3, F: 1, faithAux: { F1: null, F2: null } } };
    const b = badges(renderToStaticMarkup(<ReportScreen scores={tie} />));
    expect(b.G).toContain('var(--color-success)');
    expect(b.R).toContain('var(--color-success)');
    expect(b.O).toContain('var(--color-primary)');
  });

  it('§4-4 F는 바닥(금색), 단 F가 최고점이면 지렛대(초록)가 이긴다', () => {
    const floor = badges(renderToStaticMarkup(<ReportScreen scores={varied} />)); // F=2, 최고 아님
    expect(floor.F).toContain('var(--color-accent)');
    expect(floor.F).toContain('var(--color-text-on-gold)'); // 흰 글자는 금색 위 2.79:1 미달

    const fTop: FuturenowScores = { ...scores, grow: { G: 2, R: 3, O: 2, W: 3, F: 5, faithAux: { F1: null, F2: null } } };
    const won = badges(renderToStaticMarkup(<ReportScreen scores={fTop} />));
    expect(won.F).toContain('var(--color-success)');
    expect(won.F).not.toContain('var(--color-accent)');
  });

  // ── ADR-114 프로파일 특징(원형 재료) — 인도자 박스 실렌더 ──────────
  it('프로파일 특징이 인도자 박스에, 믿음의 자리 다음 · 주의 문구 앞에 온다', () => {
    const html = renderToStaticMarkup(<ReportScreen scores={varied} />);
    expect(html.indexOf('믿음의 자리')).toBeLessThan(html.indexOf('프로파일 특징 (원형 참고)'));
    expect(html.indexOf('프로파일 특징 (원형 참고)')).toBeLessThan(html.indexOf('그대로 쓰지 않습니다'));
    // varied = G2·R4·O2.5·W3·F2 → 현실인식 두드러짐 · 원씽 낮음 · 편차 큼
    expect(html).toContain('현실인식이 준비도 중 두드러지게 높음');
    expect(html).toContain('원씽 낮음');
    expect(html).toContain('원형은 코드가 판정하지 않습니다'); // 캡션 필수
  });

  it('원형 이름이 최종 렌더 어디에도 없다(§5-2 실렌더 확인)', () => {
    const loud: FuturenowScores = {
      ...scores,
      vitality: { score: 8, low: true },
      grow: { G: 2, R: 4, O: 2, W: 3, F: 1, faithAux: { F1: null, F2: null } },
      gap: { B1: 1, B2: 8, B3: 8, B4: 8, B5: 8 },
      compass: { NAV1: 1, NAV2: 2, NAV3: 3, NAV4: 3 },
    };
    const html = renderToStaticMarkup(<ReportScreen scores={loud} />);
    for (const name of ['명료한 정체형', '조용한 시들음형', '질주하는 회피형', '준비된 도약형', '따뜻한 표류형']) {
      expect(html, `${name} 이 화면에 있다`).not.toContain(name);
    }
    expect(html).toContain('활력 시들음 구간'); // 가드가 헛돌지 않았음
  });

  it('플래그가 하나도 없으면 「두드러진 특징 없음」', () => {
    const html = renderToStaticMarkup(<ReportScreen scores={scores} />); // 전 축 중립
    expect(html).toContain('프로파일 특징 (원형 참고)');
    expect(html).toContain('두드러진 특징 없음');
  });

  it('§4-5 불변 — 축 순서·값이 그대로다', () => {
    const html = renderToStaticMarkup(<ReportScreen scores={varied} />);
    const labels = ['조감도', '현실인식', '원씽', '피드백', '정체성'].map((l) => html.indexOf(l));
    expect(labels).toEqual([...labels].sort((a, b) => a - b)); // 순서 불변
    for (const v of ['2.0', '4.0', '2.5', '3.0']) expect(html).toContain(v); // 값 불변
  });
});
