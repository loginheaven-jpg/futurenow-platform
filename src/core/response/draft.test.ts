import { describe, expect, it } from 'vitest';
import type { Block, Item } from '@/contracts';
import { draftLocation, hasAnyAnswer } from './draft';

function item(code: string, required: boolean): Item {
  return { code, prompt: code, scale: { kind: 'likert', points: 5, minLabel: 'a', maxLabel: 'b' }, required, polarity: 'neutral' };
}
function block(id: string, items: Item[]): Block {
  return { id, kind: 'standard', title: id, items, ordering: { mode: 'fixed' } };
}

// 블록 3개: B1[필수 a,b] · B2[필수 c, 선택 d] · B3[필수 e]
const blocks: Block[] = [
  block('B1', [item('a', true), item('b', true)]),
  block('B2', [item('c', true), item('d', false)]),
  block('B3', [item('e', true)]),
];

describe('draftLocation — 안 푼 첫 필수 문항의 블록(셔플 안전)', () => {
  it('아무것도 안 풀었으면 첫 블록(0)', () => {
    expect(draftLocation(blocks, {})).toBe(0);
  });

  it('B1 다 풀고 B2 미완 → B2(1)', () => {
    expect(draftLocation(blocks, { a: 3, b: 3 })).toBe(1);
  });

  it('B1·B2 필수 풀고(선택 d 무관) B3 미완 → B3(2)', () => {
    expect(draftLocation(blocks, { a: 3, b: 3, c: 3 })).toBe(2);
  });

  it('필수 전부 풀었으면 마지막 블록(제출 도달, 2)', () => {
    expect(draftLocation(blocks, { a: 3, b: 3, c: 3, e: 3 })).toBe(2);
  });

  it('answers 키 순서(셔플) 무관 — 블록 인덱스는 블록 ORDER 기준', () => {
    expect(draftLocation(blocks, { c: 3, a: 3 })).toBe(0); // b 미완 → 여전히 B1
  });

  it('빈 schema → 0', () => {
    expect(draftLocation([], {})).toBe(0);
  });
});

describe('hasAnyAnswer — 의미 있는 응답 존재 여부', () => {
  it('빈/널 → false', () => {
    expect(hasAnyAnswer({})).toBe(false);
    expect(hasAnyAnswer(null)).toBe(false);
    expect(hasAnyAnswer(undefined)).toBe(false);
  });

  it('빈 문자열만 있으면 false', () => {
    expect(hasAnyAnswer({ a: '' })).toBe(false);
  });

  it('하나라도 응답이 있으면 true', () => {
    expect(hasAnyAnswer({ a: 0 })).toBe(true); // 0 은 유효 응답
    expect(hasAnyAnswer({ a: '글' })).toBe(true);
    expect(hasAnyAnswer({ a: false })).toBe(true); // check false 도 유효(미응답은 undefined)
  });
});
