// 쌍대비교 — 순수 로직(난수·DOM·저장 없음). 단위테스트 필수(CLAUDE §9).
//
// 원본에서 그대로 옮기면 따라오는 결함 둘을 여기서 닫는다(v3 §11).
//   #1 되돌리기가 승수를 되돌리지 않아 재선택 시 **이중 계상**된다. → 선택 이력을 남겨 되돌릴 때 되뺀다.
//   #4 동점을 id 오름차순으로 갈라 메달을 임의로 준다. → 동점은 **동점으로** 표기하고 순위를 매기지 않는다.
//
// 후보 5장이면 비교는 C(5,2)=10 회이고 승수 합은 언제나 10 이다.

/** 5장에서 만들 수 있는 모든 쌍(고정 순서 — 난수 없음). */
export function buildPairs(ids: readonly number[]): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) pairs.push([ids[i], ids[j]]);
  }
  return pairs;
}

/** 진행 상태. `picks[i]` = i 번째 비교에서 고른 카드 id(아직이면 undefined). */
export type PairwiseState = {
  /** 비교 대상 5장. 이 배열이 바뀌면 picks 는 무효다. */
  ids: number[];
  picks: (number | undefined)[];
};

export function initPairwise(ids: readonly number[]): PairwiseState {
  return { ids: [...ids], picks: new Array(buildPairs(ids).length).fill(undefined) };
}

/** 저장된 상태가 지금 후보와 맞는가. 어긋나면 처음부터 다시 한다(원본은 이 확인이 없어 조용히 어긋났다). */
export function matchesIds(state: PairwiseState | null, ids: readonly number[]): boolean {
  if (!state || state.ids.length !== ids.length) return false;
  return state.ids.every((v, i) => v === ids[i]) && state.picks.length === buildPairs(ids).length;
}

/** i 번째 비교에서 winner 를 고른다. 이미 고른 자리를 다시 고르면 **덮어쓴다**(이중 계상 없음). */
export function choose(state: PairwiseState, index: number, winner: number): PairwiseState {
  const picks = [...state.picks];
  picks[index] = winner;
  return { ...state, picks };
}

/** 되돌리기 — 그 자리의 선택을 지운다. 승수는 picks 에서 파생되므로 자동으로 되돌아간다. */
export function undo(state: PairwiseState, index: number): PairwiseState {
  const picks = [...state.picks];
  picks[index] = undefined;
  return { ...state, picks };
}

/** 아직 고르지 않은 첫 비교. 없으면 -1(전부 완료). */
export function nextIndex(state: PairwiseState): number {
  return state.picks.findIndex((p) => p === undefined);
}

export function isComplete(state: PairwiseState): boolean {
  return state.picks.every((p) => p !== undefined);
}

/** 카드별 승수. picks 에서 매번 다시 센다 — 누적 변수를 두지 않아 이중 계상이 구조적으로 불가능하다. */
export function winCounts(state: PairwiseState): Map<number, number> {
  const m = new Map<number, number>(state.ids.map((id) => [id, 0]));
  for (const p of state.picks) {
    if (p !== undefined && m.has(p)) m.set(p, m.get(p)! + 1);
  }
  return m;
}

/**
 * 승수 내림차순으로 **동점끼리 묶은** 결과. 순위 숫자를 주지 않는다 —
 * 5장 10비교에서 동점은 흔하고, 임의로 가르면 "순위에 얽매이지 마세요"라는 안내와 화면이 서로를 부정한다.
 */
export function groupByWins(state: PairwiseState): { wins: number; ids: number[] }[] {
  const counts = winCounts(state);
  const byWins = new Map<number, number[]>();
  // id 오름차순으로 넣어 같은 묶음 안의 표시 순서를 고정한다(난수·불안정 정렬 없음).
  for (const id of [...state.ids].sort((a, b) => a - b)) {
    const w = counts.get(id) ?? 0;
    byWins.set(w, [...(byWins.get(w) ?? []), id]);
  }
  return [...byWins.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([wins, ids]) => ({ wins, ids }));
}
