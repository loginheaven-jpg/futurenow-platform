// 가치 카드 — 퓨처나우 인스트루먼트 자산(v3 §9).
//   순수 로직·데이터·문안만 여기 둔다. **DB 접근은 없다** — 그것은 CoreContext 계약 메서드가 한다(v2 검토 B-2).
//   코어는 이 폴더를 모른다(CLAUDE §1·§2 경계).
export { VALUE_CARDS, CARD_BY_ID, CARD_CATEGORY, CARD_SET_VERSION, type ValueCard } from './cards';
export { CARD_ORDER, CARD_PAGES, PAGE_SIZES, TOTAL_PAGES } from './ordering';
export {
  COUNT_RULES,
  LABEL_REQUIRED,
  PAIRWISE_COUNT,
  STAGE_ORDER,
  isFirstSession,
  stageIndex,
  type ValueStage,
} from './stages';
