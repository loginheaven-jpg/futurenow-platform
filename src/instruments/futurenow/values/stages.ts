// 2단계 구조와 개수 규칙 — 선언만(순수). 화면·서버가 **같은 상수**를 읽어 규칙이 두 곳에서 갈리지 않게 한다.
//
// 구조(v3 §2): 1차는 1회차 이전 집에서, 2차는 1회차 중에. 앞은 '선정이 아니라 노출'이라 맥락이 필요 없고,
//   뒤는 삶이 증명한 것과 대조하는 일이라 맥락이 필수다.
//
//   [1차] 안내 → 카드 5화면(72장) → 정리 → 후보 8~12 → 저장·종료
//   [2차] 이어하기 → 5개 → 쌍대비교 10회 → 최종 3개 → 내 말로 바꾸기 → 대조·판정 → 결과

/** 저장 행의 `stage` 컬럼(v3 §3-1). 진행 지점이자 이어하기의 근거. */
export type ValueStage = 'exploring' | 'candidates' | 'finalists' | 'final';

/** 화면이 이 순서로만 앞으로 간다. 역행은 서버가 막는다(v3 §3-4). */
export const STAGE_ORDER: readonly ValueStage[] = ['exploring', 'candidates', 'finalists', 'final'];

export function stageIndex(s: ValueStage): number {
  return STAGE_ORDER.indexOf(s);
}

/** 1차에 속하는가 — 차수 홈 카드 문구와 이어하기 분기가 읽는다. */
export function isFirstSession(s: ValueStage): boolean {
  return s === 'exploring' || s === 'candidates';
}

/**
 * 개수 규칙(v3 §4-2).
 *
 * **미결 2건 — `docs/reports/2026-08-19-VALUE_APP_MIGRATION_v3-검토.md` 참조.**
 *   N-1: 후보 상한 12 가 화면에서는 소프트('안내만')인데 §3-4 는 서버에서 하드로 강제한다.
 *        13장을 고른 참여자가 화면을 통과하고 저장에서 예외를 받는다. 둘 중 하나로 확정해야 한다.
 *   P1 : 정리 화면 하한이 8 로 내려가면서 다음 화면(후보 좁히기)과 목표 구간이 같아졌다.
 *        (B)안(정리 화면에서 카드 추가 가능)만으로 도달 불가는 이미 해소되므로 하한을 낮출 이유가 없었다.
 *
 * 지휘부 확정 전까지 v3 §4-2 표의 값을 그대로 싣는다. 확정되면 이 파일 한 곳만 고친다.
 */
export const COUNT_RULES = {
  /** 카드 5화면 — 탐색 중에는 상한을 걸지 않는다. 끌리면 다 고른다(v3 §4-1 3항). */
  explore: { min: null, max: null },
  /** 정리 화면 — 미선택 카드를 다시 열어 **추가**할 수 있다((B)안). */
  tidy: { min: 8, max: null },
  /** 후보 좁히기 — 1차의 산출물. */
  candidates: { min: 8, max: 12 },
  /** 쌍대비교 전제라 정확히 5. */
  finalists: { min: 5, max: 5 },
  /** 최종. */
  final: { min: 3, max: 3 },
} as const;

/** 쌍대비교 횟수 — C(5,2). 화면 진행 표시가 읽는다. */
export const PAIRWISE_COUNT = 10;

/** `내 말로 바꾸기` 필수 칸 수(v3 §7 · S2-10 완화). 같은 1회차에 갈무리 필수 5칸이 함께 있다. */
export const LABEL_REQUIRED = 1;
