import { describe, it, expect } from 'vitest';
import type { Item, StandardBlock } from '@/contracts';
import { futurenowFlow } from './flow';

const SPEC_CODES = [
  'NAV1', 'NAV2', 'NAV3', 'NAV4',
  'A1', 'A2', 'A3', 'A4', 'A5',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9',
  'D1', 'D2', 'D3',
  'F1', 'F2',
  'B1', 'B2', 'B3', 'B4', 'B5',
  'E1', 'E2', 'E3',
];

function allItems(wave: 'pre' | 'post'): Item[] {
  return futurenowFlow
    .getSchema(wave)
    .blocks.flatMap((b) => (b.kind === 'standard' ? (b as StandardBlock).items : []));
}

describe('B① flow 구조', () => {
  it('7블록, instrumentId·wave 정확', () => {
    const schema = futurenowFlow.getSchema('pre');
    expect(schema.instrumentId).toBe('futurenow');
    expect(schema.wave).toBe('pre');
    expect(schema.blocks).toHaveLength(7);
  });

  it('§9.1 의 31개 코드가 모두 선언돼 있다', () => {
    const codes = allItems('pre').map((i) => i.code);
    for (const c of SPEC_CODES) expect(codes).toContain(c);
  });

  it("'지금의 나' 블록은 constrained-shuffle(첫 positive, 부정 2연속 금지)", () => {
    const now = futurenowFlow.getSchema('pre').blocks.find((b) => b.id === 'now') as StandardBlock;
    expect(now.ordering).toEqual({
      mode: 'constrained-shuffle',
      firstPolarity: 'positive',
      maxConsecutiveSameNegative: 1,
    });
    // 역채점 4문항은 negative polarity 로 표시
    const neg = now.items.filter((i) => i.polarity === 'negative').map((i) => i.code).sort();
    expect(neg).toEqual(['A2', 'A4', 'A5', 'C5', 'D1', 'D2', 'D3'].sort());
  });

  it("'믿음의 자리' 는 optional", () => {
    const faith = futurenowFlow.getSchema('pre').blocks.find((b) => b.id === 'faith') as StandardBlock;
    expect(faith.optional).toBe(true);
    expect(faith.items.every((i) => i.required === false)).toBe(true);
  });

  it('어휘 분리: prompt 에 강의 명명·구인명이 없다', () => {
    const prompts = allItems('pre').map((i) => i.prompt).join(' ');
    expect(prompts).not.toMatch(/시들음|원씽|활력|함정|나침반|GROW/);
  });

  it('wave 분기: 같은 코드, intro 서사만 다르다', () => {
    const preCodes = allItems('pre').map((i) => i.code);
    const postCodes = allItems('post').map((i) => i.code);
    expect(postCodes).toEqual(preCodes);
    const preNow = futurenowFlow.getSchema('pre').blocks.find((b) => b.id === 'now') as StandardBlock;
    const postNow = futurenowFlow.getSchema('post').blocks.find((b) => b.id === 'now') as StandardBlock;
    expect(preNow.intro).not.toEqual(postNow.intro);
  });
});
