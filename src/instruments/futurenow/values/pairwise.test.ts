import { describe, expect, it } from 'vitest';
import {
  buildPairs, choose, groupByWins, initPairwise, isComplete, matchesIds, nextIndex, undo, winCounts,
} from './pairwise';

const FIVE = [3, 17, 24, 31, 45];

describe('쌍 생성', () => {
  it('5장이면 10쌍이고 중복이 없다', () => {
    const pairs = buildPairs(FIVE);
    expect(pairs).toHaveLength(10);
    expect(new Set(pairs.map(([a, b]) => `${a}-${b}`)).size).toBe(10);
  });

  it('고정 순서다 — 난수가 없다', () => {
    expect(buildPairs(FIVE)).toEqual(buildPairs(FIVE));
    expect(buildPairs(FIVE)[0]).toEqual([3, 17]);
  });
});

// 원본 결함 #1 — 되돌아가도 승수가 줄지 않아 재선택 시 이중 계상됐다(원본 주석이 자인).
//   승수를 누적 변수로 두지 않고 picks 에서 매번 파생시켜 구조적으로 막았다.
describe('되돌리기가 승수를 되돌린다 (원본 결함 #1)', () => {
  it('같은 자리를 다시 고르면 덮어쓴다 — 두 번 세지 않는다', () => {
    let s = initPairwise(FIVE);
    s = choose(s, 0, 3);
    s = choose(s, 0, 17); // 마음을 바꿈
    const w = winCounts(s);
    expect(w.get(3)).toBe(0);
    expect(w.get(17)).toBe(1);
  });

  it('되돌린 뒤 다시 고르면 합이 늘지 않는다', () => {
    let s = initPairwise(FIVE);
    s = choose(s, 0, 3);
    s = undo(s, 0);
    s = choose(s, 0, 3);
    expect([...winCounts(s).values()].reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('전부 고르면 승수 합이 언제나 10 이다', () => {
    let s = initPairwise(FIVE);
    buildPairs(FIVE).forEach(([a], i) => { s = choose(s, i, a); });
    expect(isComplete(s)).toBe(true);
    expect([...winCounts(s).values()].reduce((a, b) => a + b, 0)).toBe(10);
  });
});

describe('진행 위치', () => {
  it('아직 안 고른 첫 자리를 준다', () => {
    let s = initPairwise(FIVE);
    expect(nextIndex(s)).toBe(0);
    s = choose(s, 0, 3);
    expect(nextIndex(s)).toBe(1);
  });

  it('후보가 바뀌면 저장된 진행을 버린다 — 원본은 이 확인이 없어 조용히 어긋났다', () => {
    const s = initPairwise(FIVE);
    expect(matchesIds(s, FIVE)).toBe(true);
    expect(matchesIds(s, [3, 17, 24, 31, 99])).toBe(false);
    expect(matchesIds(s, [3, 17, 24])).toBe(false);
    expect(matchesIds(null, FIVE)).toBe(false);
  });
});

// 원본 결함 #4 — 동점을 id 오름차순으로 갈라 메달을 임의로 줬다.
//   "순위에 얽매이지 마세요"라는 안내와 화면이 서로를 부정했다.
describe('동점은 동점으로 묶는다 (원본 결함 #4)', () => {
  it('완전 순환(2-2-2-2-2)이면 한 묶음이다', () => {
    let s = initPairwise(FIVE);
    // 각 카드가 뒤 두 장을 이기는 순환 — 다섯 장 모두 2승.
    buildPairs(FIVE).forEach(([a, b], i) => {
      const ai = FIVE.indexOf(a); const bi = FIVE.indexOf(b);
      const aWins = (bi - ai + 5) % 5 <= 2;
      s = choose(s, i, aWins ? a : b);
    });
    const g = groupByWins(s);
    expect(g).toHaveLength(1);
    expect(g[0].wins).toBe(2);
    expect(g[0].ids).toHaveLength(5);
  });

  it('묶음은 승수 내림차순이고, 묶음 안은 id 오름차순으로 고정된다', () => {
    let s = initPairwise(FIVE);
    buildPairs(FIVE).forEach(([a], i) => { s = choose(s, i, a); });
    const g = groupByWins(s);
    expect(g.map((x) => x.wins)).toEqual([...g.map((x) => x.wins)].sort((a, b) => b - a));
    for (const grp of g) expect(grp.ids).toEqual([...grp.ids].sort((a, b) => a - b));
  });

  it('순위 숫자를 만들지 않는다 — 승수와 id 만 준다', () => {
    const g = groupByWins(initPairwise(FIVE));
    expect(Object.keys(g[0]).sort()).toEqual(['ids', 'wins']);
  });
});
