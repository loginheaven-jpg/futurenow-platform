import { describe, expect, it } from 'vitest';
import type { FuturenowScores } from '../scoring';
import { buildInterpretationInput, parseInterpretation } from './interpretation';

function scores(over: Partial<FuturenowScores> = {}): FuturenowScores {
  return {
    vitality: { score: 8, low: true },
    redFlag: { triggered: false, byVitality: false, byCareCheck: false },
    grow: { G: 3.5, R: 4, O: 2, W: 3, F: 4, faithAux: { F1: null, F2: null } },
    trap: { D1: 2, D2: 4, D3: 1, primary: 'D2' },
    compass: { NAV1: 4, NAV2: 2, NAV3: 3, NAV4: 5 },
    gap: { B1: 7, B2: 3, B3: 8, B4: 5, B5: 6 },
    faith: { F1: null, F2: null },
    subjective: { E1: '더 단단해지고 싶어요', E2: '', E3: '' },
    ...over,
  };
}

describe('buildInterpretationInput — scores를 labels 어휘로 변환', () => {
  it('활력 구간명·축 라벨·점수를 포함(어휘 안에서만)', () => {
    const input = buildInterpretationInput(scores());
    expect(input).toContain('시들음'); // 활력 8 → 시들음 구간
    expect(input).toContain('동기'); // 나침반 라벨
    expect(input).toContain('원씽'); // GROW 라벨
    expect(input).toContain('재정'); // 간격 라벨
    expect(input).toContain('8점');
  });

  it('함정(D코드)·믿음(faith)·원응답 문항은 AI 입력에 없음(환각 방지·어휘 분리 ADR-77 §5.5)', () => {
    const input = buildInterpretationInput(scores());
    expect(input).not.toContain('D1');
    expect(input).not.toContain('D2');
    expect(input).not.toMatch(/믿음|신앙/);
    expect(input).not.toMatch(/관성|안주/); // 함정 라벨(TRAP_AXES) 미입력('준비'는 '준비도'와 충돌해 제외 — 관성·안주로 충분)
    expect(input).not.toContain('제자리걸음'); // 원응답 문항 원문(A2) 전량 미입력 — E1~E3 클립만 유지
  });

  it('돌봄 신호 없으면 caution 키 금지 안내, 있으면 포함 안내', () => {
    const calm = buildInterpretationInput(scores({ vitality: { score: 20, low: false } }));
    expect(calm).toContain('caution 키는 넣지 마세요');
    const care = buildInterpretationInput(scores({ redFlag: { triggered: true, byVitality: true, byCareCheck: false } }));
    expect(care).toContain('caution 키를 포함');
    expect(care).toContain('돌봄 신호] 있음');
  });

  it('주관식 원문 발췌 포함(라벨과 함께)', () => {
    const input = buildInterpretationInput(scores());
    expect(input).toContain('기대: 더 단단해지고 싶어요');
  });
});

describe('parseInterpretation — 방어적 파싱', () => {
  const valid = '{"headline":"전반적으로 차분한 인상이에요","axes":[{"name":"동기","reading":"접근 경향이 보입니다"}],"growth":"원씽을 좁히면 좋겠어요"}';

  it('정상 JSON 파싱', () => {
    const c = parseInterpretation(valid);
    expect(c.headline).toContain('차분');
    expect(c.axes[0].name).toBe('동기');
    expect(c.caution).toBeUndefined();
  });

  it('```json 코드펜스 감싸짐 strip', () => {
    const c = parseInterpretation('```json\n' + valid + '\n```');
    expect(c.headline).toContain('차분');
  });

  it('서두 텍스트가 붙어도 첫{~끝} 추출', () => {
    const c = parseInterpretation('네, 다음과 같습니다:\n' + valid);
    expect(c.axes).toHaveLength(1);
  });

  it('caution 포함 정상 파싱', () => {
    const c = parseInterpretation('{"headline":"h","axes":[],"caution":"가벼운 안부를 권합니다","growth":"g"}');
    expect(c.caution).toBe('가벼운 안부를 권합니다');
  });

  it('JSON 아님 → throw', () => {
    expect(() => parseInterpretation('해석을 생성할 수 없습니다')).toThrow();
  });

  it('필수 필드 누락(headline 없음) → throw', () => {
    expect(() => parseInterpretation('{"axes":[],"growth":"g"}')).toThrow();
  });
});
