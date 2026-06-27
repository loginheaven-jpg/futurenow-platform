import { describe, it, expect } from 'vitest';
import type { Item, Polarity } from '@/contracts';
import { applyOrdering } from './ordering';

// 결정적 rng(LCG) — 시드별 재현 가능.
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const item = (code: string, polarity: Polarity): Item => ({
  code,
  prompt: code,
  scale: { kind: 'likert', points: 5, minLabel: 'a', maxLabel: 'b' },
  required: true,
  polarity,
});

// 퓨처나우 '지금의 나' 17문항(positive 10 / negative 7)
const NOW: Item[] = [
  item('A1', 'positive'), item('C3', 'positive'), item('A2', 'negative'), item('C6', 'positive'),
  item('D1', 'negative'), item('C2', 'positive'), item('A5', 'negative'), item('C8', 'positive'),
  item('C5', 'negative'), item('A3', 'positive'), item('D2', 'negative'), item('C1', 'positive'),
  item('A4', 'negative'), item('C7', 'positive'), item('D3', 'negative'), item('C4', 'positive'),
  item('C9', 'positive'),
];

const POLICY = { mode: 'constrained-shuffle', firstPolarity: 'positive', maxConsecutiveSameNegative: 1 } as const;

function maxNegRun(items: Item[]): number {
  let run = 0;
  let max = 0;
  for (const i of items) {
    run = i.polarity === 'negative' ? run + 1 : 0;
    max = Math.max(max, run);
  }
  return max;
}

describe('applyOrdering', () => {
  it("fixed 는 선언 순서 그대로", () => {
    const out = applyOrdering(NOW, { mode: 'fixed' });
    expect(out.map((i) => i.code)).toEqual(NOW.map((i) => i.code));
  });

  it('constrained-shuffle: 여러 시드에서 제약을 모두 지킨다', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const out = applyOrdering(NOW, POLICY, lcg(seed));
      // 같은 코드 집합(순열)
      expect(out.map((i) => i.code).sort()).toEqual(NOW.map((i) => i.code).sort());
      // 첫 문항 positive
      expect(out[0].polarity).toBe('positive');
      // 부정 2연속 금지(maxNeg=1)
      expect(maxNegRun(out)).toBeLessThanOrEqual(1);
    }
  });

  it('실제로 섞인다(고정 순서와 다른 결과가 나온다)', () => {
    const a = applyOrdering(NOW, POLICY, lcg(7)).map((i) => i.code);
    expect(a).not.toEqual(NOW.map((i) => i.code));
  });
});
