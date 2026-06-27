import { describe, it, expect } from 'vitest';
import type { Answers } from '@/contracts';
import { scoreFuturenow } from './scoring';

// 모든 필수 응답이 채워진 기준 응답(전부 중립값 3, 간격 5).
function base(): Answers {
  const a: Answers = {
    NAV1: 3, NAV2: 3, NAV3: 3, NAV4: 3,
    A1: 3, A2: 3, A3: 3, A4: 3, A5: 3,
    C1: 3, C2: 3, C3: 3, C4: 3, C5: 3, C6: 3, C7: 3, C8: 3, C9: 3,
    D1: 3, D2: 3, D3: 3,
    F1: 3, F2: 3,
    B1: 5, B2: 5, B3: 5, B4: 5, B5: 5,
    E1: '기대', E2: '정서', E3: '요청',
    INTRO: '조감도', CARE: false, COMMIT: false,
  };
  return a;
}
const with_ = (over: Answers): Answers => ({ ...base(), ...over });

describe('규칙① 활력 지수 = A1 + A3 + (6−A2) + (6−A5) + (6−A4), 5~25, ≤10 = low', () => {
  it('기준(전부 3) → 15, low=false', () => {
    const s = scoreFuturenow(base());
    expect(s.vitality.score).toBe(15);
    expect(s.vitality.low).toBe(false);
  });
  it('최저: A1=A3=1, A2=A5=A4=5 → 5, low=true', () => {
    const s = scoreFuturenow(with_({ A1: 1, A3: 1, A2: 5, A5: 5, A4: 5 }));
    expect(s.vitality.score).toBe(5);
    expect(s.vitality.low).toBe(true);
  });
  it('최고: A1=A3=5, A2=A5=A4=1 → 25', () => {
    expect(scoreFuturenow(with_({ A1: 5, A3: 5, A2: 1, A5: 1, A4: 1 })).vitality.score).toBe(25);
  });
  it('경계: 정확히 10 → low=true, 11 → low=false (역채점 확인)', () => {
    expect(scoreFuturenow(with_({ A1: 3, A3: 3, A2: 5, A5: 5, A4: 4 })).vitality).toEqual({ score: 10, low: true });
    expect(scoreFuturenow(with_({ A1: 3, A3: 3, A2: 5, A5: 5, A4: 3 })).vitality).toEqual({ score: 11, low: false });
  });
});

describe('규칙② Red Flag = (A2·A5·A4 모두 ≥4) 또는 돌봄 체크', () => {
  it('기준 → false', () => {
    expect(scoreFuturenow(base()).redFlag).toEqual({ triggered: false, byVitality: false, byCareCheck: false });
  });
  it('A2=A5=A4=4 → byVitality', () => {
    const s = scoreFuturenow(with_({ A2: 4, A5: 4, A4: 4 }));
    expect(s.redFlag.byVitality).toBe(true);
    expect(s.redFlag.triggered).toBe(true);
  });
  it('하나라도 3이면 byVitality=false', () => {
    expect(scoreFuturenow(with_({ A2: 4, A5: 4, A4: 3 })).redFlag.byVitality).toBe(false);
  });
  it('돌봄 체크 → byCareCheck', () => {
    const s = scoreFuturenow(with_({ CARE: true }));
    expect(s.redFlag).toEqual({ triggered: true, byVitality: false, byCareCheck: true });
  });
  it('둘 다 → 양쪽 true', () => {
    const s = scoreFuturenow(with_({ A2: 5, A5: 5, A4: 5, CARE: true }));
    expect(s.redFlag).toEqual({ triggered: true, byVitality: true, byCareCheck: true });
  });
});

describe('규칙③ GROW+F (O = avg(C6, 6−C5) 역채점)', () => {
  it('기준 → 전부 3', () => {
    const g = scoreFuturenow(base()).grow;
    expect(g).toMatchObject({ G: 3, R: 3, O: 3, W: 3, F: 3 });
  });
  it('G=avg(C2,C1), F=C9', () => {
    const g = scoreFuturenow(with_({ C2: 5, C1: 1, C9: 4 })).grow;
    expect(g.G).toBe(3);
    expect(g.F).toBe(4);
  });
  it('O 역채점: C6=4, C5=2 → avg(4, 4) = 4', () => {
    expect(scoreFuturenow(with_({ C6: 4, C5: 2 })).grow.O).toBe(4);
  });
  it('보조 faithAux 는 F1·F2 그대로, 무응답은 null', () => {
    expect(scoreFuturenow(base()).grow.faithAux).toEqual({ F1: 3, F2: 3 });
    const noF1 = base();
    delete noF1.F1;
    expect(scoreFuturenow(noF1).grow.faithAux.F1).toBeNull();
  });
});

describe('규칙④ 함정 유형 = D1·D2·D3 원점수 최고점(동점 시 앞선 코드)', () => {
  it('기준(동점) → D1', () => {
    expect(scoreFuturenow(base()).trap.primary).toBe('D1');
  });
  it('D2 최고 → D2', () => {
    expect(scoreFuturenow(with_({ D1: 2, D2: 5, D3: 3 })).trap.primary).toBe('D2');
  });
  it('D3 최고 → D3', () => {
    expect(scoreFuturenow(with_({ D1: 1, D2: 2, D3: 4 })).trap.primary).toBe('D3');
  });
  it('D1·D2 동점 최고 → D1', () => {
    expect(scoreFuturenow(with_({ D1: 5, D2: 5, D3: 1 })).trap.primary).toBe('D1');
  });
});

describe('규칙⑤⑥ 나침반·간격 (원점수)', () => {
  it('compass = NAV1~4 raw', () => {
    expect(scoreFuturenow(with_({ NAV1: 5, NAV2: 1, NAV3: 4, NAV4: 2 })).compass).toEqual({
      NAV1: 5, NAV2: 1, NAV3: 4, NAV4: 2,
    });
  });
  it('gap = B1~B5 raw', () => {
    expect(scoreFuturenow(with_({ B1: 0, B2: 10, B3: 7, B4: 3, B5: 5 })).gap).toEqual({
      B1: 0, B2: 10, B3: 7, B4: 3, B5: 5,
    });
  });
});

describe('규칙⑦ 믿음의 자리 (점수화 안 함, 무응답 null)', () => {
  it('F1·F2 그대로', () => {
    expect(scoreFuturenow(with_({ F1: 2, F2: 5 })).faith).toEqual({ F1: 2, F2: 5 });
  });
  it('무응답 → null (실패 아님, 신호)', () => {
    const a = base();
    delete a.F1;
    delete a.F2;
    expect(scoreFuturenow(a).faith).toEqual({ F1: null, F2: null });
  });
});

describe('어휘 분리: 산출물에 강의 명명이 없다', () => {
  it("'시들음'·'원씽' 등은 scores 어디에도 없다", () => {
    const json = JSON.stringify(scoreFuturenow(with_({ A1: 1, A3: 1, A2: 5, A5: 5, A4: 5 })));
    expect(json).not.toMatch(/시들음|원씽|languish/i);
  });
});

describe('주관식 원문 통과(리포트 표시용 — 계약상 scores 만 renderScreen 에 전달)', () => {
  it('E1~E3 텍스트를 그대로 싣는다', () => {
    const s = scoreFuturenow(with_({ E1: '기대문', E2: '정서문', E3: '요청문' }));
    expect(s.subjective).toEqual({ E1: '기대문', E2: '정서문', E3: '요청문' });
  });
  it('무응답은 빈 문자열', () => {
    const a = base();
    delete a.E3;
    expect(scoreFuturenow(a).subjective.E3).toBe('');
  });
});
