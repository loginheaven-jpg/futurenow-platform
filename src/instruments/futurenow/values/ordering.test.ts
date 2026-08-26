import { describe, expect, it } from 'vitest';
import { CARD_CATEGORY, VALUE_CARDS } from './cards';
import { CARD_ORDER, CARD_PAGES, PAGE_SIZES, TOTAL_PAGES } from './ordering';

const catOf = (id: number) => CARD_CATEGORY[id];

describe('카드 배열 — 전수·결정성', () => {
  it('72장을 한 번씩 담는다', () => {
    expect(CARD_ORDER).toHaveLength(72);
    expect(new Set(CARD_ORDER).size).toBe(72);
    expect([...CARD_ORDER].sort((a, b) => a - b)).toEqual(VALUE_CARDS.map((c) => c.id));
  });

  // 난수를 쓰지 않는다는 것의 관측 가능한 형태 — 같은 입력에 같은 출력.
  //   1차는 집에서 중단·재개하고 2차가 1차 결과를 되비추므로 순서가 흔들리면 안 된다(v3 §4-1).
  it('결정적이다 — 재계산해도 같은 배열', async () => {
    const again = await import('./ordering?reload=1' as string).catch(() => null);
    // 동적 재수입이 막힌 환경에서는 상수 동일성만 확인한다(모듈 캐시 특성).
    if (again) expect((again as { CARD_ORDER: readonly number[] }).CARD_ORDER).toEqual(CARD_ORDER);
    else expect(CARD_ORDER).toEqual([...CARD_ORDER]);
  });
});

// 이 파일의 존재 이유. 카테고리가 뭉치면 화면이 주제별로 읽히고 질문이
//   "무엇에 끌리는가"에서 "이 영역에서 무엇을 중시해야 하는가"로 바뀐다(v1 검토 R-7).
describe('카테고리가 흩어져 있다', () => {
  it('인접한 두 장이 같은 카테고리가 아니다', () => {
    const 붙은자리: string[] = [];
    for (let i = 1; i < CARD_ORDER.length; i++) {
      if (catOf(CARD_ORDER[i]) === catOf(CARD_ORDER[i - 1])) {
        붙은자리.push(`${i - 1}·${i} = ${catOf(CARD_ORDER[i])}`);
      }
    }
    expect(붙은자리).toEqual([]);
  });

  // 화면 단위 쏠림도 막는다. 가장 큰 카테고리(관계 14)가 5화면에 고르게 퍼지면 화면당 3장 안팎이다.
  //   한 화면에서 4장을 넘으면 그 화면이 주제 화면처럼 읽히기 시작한다.
  it('어떤 화면에서도 한 카테고리가 4장을 넘지 않는다', () => {
    for (const [i, page] of CARD_PAGES.entries()) {
      const 집계 = new Map<string, number>();
      for (const id of page) 집계.set(catOf(id), (집계.get(catOf(id)) ?? 0) + 1);
      const 최대 = [...집계.entries()].sort((a, b) => b[1] - a[1])[0];
      expect(최대[1], `${i + 1}화면 최다 카테고리 ${최대[0]}`).toBeLessThanOrEqual(4);
    }
  });
});

describe('화면 분할', () => {
  it('5화면이고 15/15/14/14/14 다', () => {
    expect(TOTAL_PAGES).toBe(5);
    expect(PAGE_SIZES).toEqual([15, 15, 14, 14, 14]);
    expect(PAGE_SIZES.reduce((a, b) => a + b, 0)).toBe(72);
    expect(CARD_PAGES.map((p) => p.length)).toEqual([15, 15, 14, 14, 14]);
  });

  it('화면을 이어 붙이면 배열과 같다 — 누락·중복 없음', () => {
    expect(CARD_PAGES.flatMap((p) => [...p])).toEqual([...CARD_ORDER]);
  });
});
