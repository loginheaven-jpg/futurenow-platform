// 카드 노출 배열 — **결정적 고정 배열**(v3 §4-1). 순수 함수, 난수 없음.
//
// 왜 난수가 아닌가: 지시서가 "참여자별 셔플 아님(재개·비교 가능성 유지)"을 못 박았다. 1차는 집에서
//   중단·재개하고 2차에서 1차 결과를 되비추므로, 같은 사람이 같은 순서를 다시 봐야 한다.
//   그리고 참여자 간 비교(어떤 카드가 몇 번 뽑혔는가)도 노출 순서가 같아야 뜻이 있다.
//
// 왜 `core/response/ordering.ts` 를 재사용하지 않는가: 그 선례는 **런타임 rng 셔플**이고
//   `Item.polarity`(문항 극성)를 축으로 삼는다. 카드에는 polarity 가 없고 난수도 쓰면 안 된다.
//   지시서 §4-1 이 그 파일을 선례로 들었으나 하는 일이 반대라, 사고(제약을 걸어 쏠림을 푼다)만 계승한다.
//
// 제약: **인접한 두 장이 같은 카테고리가 아니다.** 원본이 카드를 섞어 둔 것은 게으름이 아니라 설계였다
//   (원본 `docs/00-HANDOVER.md` — "사회적으로 중요해야 한다고 생각하는 항목이 아니라 마음이 끌리는 값").
//   카테고리가 뭉치면 화면이 주제별로 읽히고, 그 순간 질문이 "무엇에 끌리는가"에서
//   "이 영역에서 무엇을 중시해야 하는가"로 바뀐다(v1 검토 R-7).
//
// 알고리즘: **보폭(stride) 분배 + 인접 복구.**
//   ① 각 카테고리의 k번째 카드에 좌표 `(k + 0.5) / 카테고리크기` 를 준다. 0~1 구간에 그 카테고리를
//      균등히 펼치는 좌표다. 크기가 14든 1이든 전 구간에 고르게 퍼진다.
//   ② 전체를 좌표 오름차순으로 정렬한다. 동좌표는 카테고리크기 내림차순 → 카테고리명 → id 순.
//   ③ 그래도 인접이 남으면 뒤쪽에서 다른 카테고리를 끌어와 맞바꾼다(결정적 탐색).
//
//   greedy(남은 수 최다 우선)를 먼저 썼다가 버렸다 — **인접 제약은 만족하지만 화면 단위로 쏠린다.**
//   큰 카테고리가 앞 화면으로 몰려 1화면에 관계 8장이 들어갔다(전체의 절반 이상). 인접만 보는 제약으로는
//   화면이 주제 화면처럼 읽히는 것을 못 막는다. 보폭 분배는 전 구간 균등이라 화면당 몫이 자동으로 맞는다.
import { CARD_CATEGORY, VALUE_CARDS } from './cards';

/** 화면당 장수. 합 72. 5화면(v3 §4-1). */
export const PAGE_SIZES: readonly number[] = [15, 15, 14, 14, 14];

function buildOrder(): number[] {
  // 카테고리 → 카드 id(오름차순). 카테고리명 정렬로 순회 순서를 고정한다.
  const pool = new Map<string, number[]>();
  for (const card of [...VALUE_CARDS].sort((a, b) => a.id - b.id)) {
    const cat = CARD_CATEGORY[card.id];
    const bucket = pool.get(cat);
    if (bucket) bucket.push(card.id);
    else pool.set(cat, [card.id]);
  }

  // ① 보폭 좌표
  const slots: { id: number; cat: string; key: number; size: number }[] = [];
  for (const cat of [...pool.keys()].sort()) {
    const ids = pool.get(cat)!;
    ids.forEach((id, k) => slots.push({ id, cat, key: (k + 0.5) / ids.length, size: ids.length }));
  }

  // ② 좌표 정렬. 동좌표 tie-break 은 전부 결정적이다(난수 없음).
  slots.sort((a, b) =>
    a.key !== b.key ? a.key - b.key
    : b.size !== a.size ? b.size - a.size
    : a.cat !== b.cat ? (a.cat < b.cat ? -1 : 1)
    : a.id - b.id,
  );

  // ③ 인접 복구 — i 와 i-1 이 같은 카테고리면, 뒤에서 양옆과 겹치지 않는 첫 카드를 찾아 맞바꾼다.
  for (let i = 1; i < slots.length; i++) {
    if (slots[i].cat !== slots[i - 1].cat) continue;
    for (let j = i + 1; j < slots.length; j++) {
      const 앞 = slots[i - 1].cat;
      const 뒤 = i + 1 < slots.length ? slots[i + 1].cat : null;
      const 후보 = slots[j].cat;
      // 후보가 i 자리에 와도 되는가 + 밀려나는 slots[i] 가 j 자리에 가도 되는가
      const iOk = 후보 !== 앞 && 후보 !== 뒤;
      const jOk =
        (j - 1 === i || slots[j - 1].cat !== slots[i].cat) &&
        (j + 1 >= slots.length || slots[j + 1].cat !== slots[i].cat);
      if (iOk && jOk) {
        [slots[i], slots[j]] = [slots[j], slots[i]];
        break;
      }
    }
  }

  return slots.map((s) => s.id);
}

/** 72장의 노출 순서(카드 id). 모듈 로드 시 한 번 계산되고 이후 불변이다. */
export const CARD_ORDER: readonly number[] = Object.freeze(buildOrder());

/** `CARD_ORDER` 를 `PAGE_SIZES` 대로 5화면으로 자른 것. */
export const CARD_PAGES: readonly (readonly number[])[] = Object.freeze(
  PAGE_SIZES.reduce<{ pages: number[][]; at: number }>(
    (acc, size) => {
      acc.pages.push(CARD_ORDER.slice(acc.at, acc.at + size));
      acc.at += size;
      return acc;
    },
    { pages: [], at: 0 },
  ).pages.map((p) => Object.freeze(p)),
);

/** 화면 수(진행 표시 `n / TOTAL_PAGES` 에 쓴다). */
export const TOTAL_PAGES = PAGE_SIZES.length;
