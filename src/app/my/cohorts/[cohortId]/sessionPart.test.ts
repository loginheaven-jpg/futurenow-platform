// 회차 → 파트 매핑 (4차 F-4).
import { describe, expect, it } from 'vitest';
import { sessionPart, sessionPartLabel } from './sessionPart';

describe('sessionPart', () => {
  it.each([
    [1, 'PART 1 · GOAL'],
    [2, 'PART 1 · GOAL'],
    [3, 'PART 2 · REALITY'],
    [4, 'PART 3 · OPTIONS'],
    [5, 'PART 4 · WILL'],
    [6, 'PART 5 · FAITH'],
  ])('%i회차 → %s', (no, label) => {
    expect(sessionPartLabel(no)).toBe(label);
  });

  it('1·2회차가 **같은 파트**다 — 시안 `.grid-f` 의 `1–2회차` 그대로', () => {
    expect(sessionPart(1)).toEqual(sessionPart(2));
  });

  it('**모르는 회차는 지어내지 않는다** — null 이고 화면은 그 줄을 그리지 않는다', () => {
    for (const n of [0, 7, 99, -1]) expect(sessionPartLabel(n), `${n}회차`).toBeNull();
    expect(sessionPartLabel(null)).toBeNull();
    expect(sessionPartLabel(undefined)).toBeNull();
  });

  it('다섯 축 순서가 곧 파트 번호다', () => {
    expect([1, 3, 4, 5, 6].map((n) => sessionPart(n)!.no)).toEqual([1, 2, 3, 4, 5]);
    expect([1, 3, 4, 5, 6].map((n) => sessionPart(n)!.letter).join('')).toBe('GROWF');
  });
});
