import { describe, it, expect } from 'vitest';
import type { Answers } from '@/contracts';
import { scoreFuturenow } from './scoring';
import { futurenowAlerts } from './alerts';

function base(): Answers {
  return {
    NAV1: 3, NAV2: 3, NAV3: 3, NAV4: 3,
    A1: 3, A2: 3, A3: 3, A4: 3, A5: 3,
    C1: 3, C2: 3, C3: 3, C4: 3, C5: 3, C6: 3, C7: 3, C8: 3, C9: 3,
    D1: 3, D2: 3, D3: 3,
    F1: 3, F2: 3,
    B1: 5, B2: 5, B3: 5, B4: 5, B5: 5,
    E1: 'x', E2: 'y', CARE: false, COMMIT: false,
  };
}
const evalFor = (over: Answers) => {
  const a = { ...base(), ...over };
  // 계약상 evaluate(scores, answers) — 본 구현은 answers 를 쓰지 않지만 호출은 2-인자.
  return futurenowAlerts.evaluate(scoreFuturenow(a), a);
};

describe('B④ AlertPlugin.evaluate', () => {
  it('위험 없음 → 빈 배열', () => {
    expect(evalFor({})).toEqual([]);
  });

  it('활력 위기(A2·A5·A4 모두 ≥4) → red_flag', () => {
    const out = evalFor({ A2: 5, A5: 4, A4: 4 });
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('red_flag');
    expect(out[0].reason).toBe('활력 위기신호');
  });

  it('돌봄 체크만 → care', () => {
    const out = evalFor({ CARE: true });
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('care');
    expect(out[0].reason).toBe('돌봄 요청 신호');
  });

  it('둘 다 → red_flag 우선(한 건)', () => {
    const out = evalFor({ A2: 5, A5: 5, A4: 5, CARE: true });
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('red_flag');
  });

  it('AlertSignal 형상 — severity·reason 만(responseId/cohortId 없음, 코어가 주입)', () => {
    const out = evalFor({ CARE: true });
    expect(Object.keys(out[0]).sort()).toEqual(['reason', 'severity']);
    expect(out[0].reason).not.toMatch(/[0-9]/); // 점수·원문 미적재
  });
});
