// 제약 무작위 배열 (코어 러너 책임, 순수 함수). architecture §8.1·§9.2.
// 'fixed' → 선언 순서 그대로. 'constrained-shuffle' → firstPolarity·maxConsecutiveSameNegative 준수.
// rng 주입(테스트 가능). 기본 Math.random.
import type { Item, OrderingPolicy } from '@/contracts';

type Rng = () => number;

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function applyOrdering(items: Item[], policy: OrderingPolicy, rng: Rng = Math.random): Item[] {
  if (policy.mode === 'fixed') return [...items];

  const maxNeg = policy.maxConsecutiveSameNegative ?? items.length;
  const first = policy.firstPolarity;

  const neg = shuffle(items.filter((i) => i.polarity === 'negative'), rng);
  const nonNeg = shuffle(items.filter((i) => i.polarity !== 'negative'), rng);

  if (!nonNeg.length) return neg; // 모두 부정(이론상) — 그대로

  // firstPolarity 가 지정되면 해당 극성 비부정 항목을 맨 앞으로.
  if (first) {
    const idx = nonNeg.findIndex((i) => i.polarity === first);
    if (idx > 0) {
      const [it] = nonNeg.splice(idx, 1);
      nonNeg.unshift(it);
    }
  }

  // 비부정 항목 사이/뒤 gap(=nonNeg.length개, 첫 항목 앞에는 두지 않음 → 선두 비부정 유지)에
  // 부정 항목을 gap당 최대 maxNeg개씩 분산 배치(무작위 gap 선택).
  const buckets: Item[][] = Array.from({ length: nonNeg.length }, () => []);
  const gapOrder = shuffle([...nonNeg.keys()], rng);
  let cursor = 0;
  for (const n of neg) {
    let placed = false;
    for (let t = 0; t < gapOrder.length; t++) {
      const g = gapOrder[cursor % gapOrder.length];
      cursor++;
      if (buckets[g].length < maxNeg) {
        buckets[g].push(n);
        placed = true;
        break;
      }
    }
    if (!placed) buckets[buckets.length - 1].push(n); // 용량 부족(제약 불가능) 시 말미로 — 데이터상 미발생
  }

  const result: Item[] = [];
  for (let i = 0; i < nonNeg.length; i++) {
    result.push(nonNeg[i]);
    for (const n of buckets[i]) result.push(n);
  }
  return result;
}
