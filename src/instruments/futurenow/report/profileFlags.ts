// 인도자 전용 '프로파일 특징' — 원형 **가설의 재료**만 모은다. ADR-114.
//
// **원형을 판정하지 않는다.** 원형은 극단을 그린 초상이라 대부분의 사람은 여섯 중 어디에도 딱 맞지 않고,
//   자동 규칙은 오분류하거나 아무것도 못 고른다. 더 중요한 이유는 닻내림이다 — 박스에 원형 이름이 떠 있으면
//   인도자가 그 판정에 묶여, 가이드가 말한 `원형은 가설이지 서랍이 아니다` 가 무너진다.
//   그래서 코드는 **사실**(어느 축이 두드러진다)만 말하고 **판정**(어느 원형이다)은 인도자가 한다.
//   이 분리를 무너뜨리는 변경(원형명 표시, 플래그→원형 매핑)은 이 모듈의 취지에 반한다.
//
// 표시 층의 파생값이다 — `scoring.ts` 에 넣지 않는다(`careBanner` 가 여기 계열에 사는 것과 같은 성격).
//   AI 입력(`interpretation.ts`)에도 넣지 않는다.
import type { FuturenowScores } from '../scoring';
import { vitalityZone } from './labels';

export type ProfileFlag = { id: string; text: string };

/**
 * 임계값 — 최박사가 조정하기 쉽도록 한 곳에 모은다(ORDER §4.1).
 *
 * **활력 임계는 여기 없다.** `≤10 시들음 · ≥18 번성` 은 이미 `VITALITY_ZONES` 로 확정돼 있고
 * `vitality.low` 도 같은 경계를 쓴다. 여기 사본을 두면 시들음 경계가 세 곳이 되어,
 * 하나만 고쳤을 때 화면의 구간명과 플래그가 어긋난다. 그래서 **기존 판정을 그대로 부른다.**
 */
export const FLAG_THRESHOLDS = {
  /** 준비도 다섯 축 고르게 높음 — 최저축 ≥ 이 값 */
  growEven: 4,
  /** 준비도 편차 큼 — 최고−최저 ≥ 이 값 */
  growSpread: 2,
  /** 현실인식이 2위 축보다 이만큼 이상 높을 때 '두드러짐' */
  realismLead: 1,
  /** 원씽 낮음 — O ≤ 이 값 */
  oneThingLow: 2.5,
  /** 한 영역만 깊이 함몰 — 나머지 네 영역 평균 − 최저 ≥ 이 값 */
  gapSink: 3,
  /** 관계·기여 점수 높음 — B3·B5 둘 다 ≥ 이 값 */
  warmHigh: 7,
  /** 나침반 좌측으로 보는 기준(이하) */
  compassLow: 2,
  /** 나침반 우측으로 보는 기준(이상) */
  compassHigh: 4,
  /** 좌·우 쏠림 판정에 필요한 축 수 */
  compassCount: 2,
} as const;

/**
 * 조건을 만족하는 플래그만 순서대로 반환한다(활력 → 준비도 → 간격 → 나침반).
 * 아무것도 안 맞으면 빈 배열 — 그때 화면이 `두드러진 특징 없음` 을 쓴다.
 *
 * 주관식(E1·E2·E3)은 쓰지 않는다 — 감정을 자동 판정하지 않는다. 정서·기대는 인도자가 원응답에서 직접 읽는다.
 */
export function profileFlags(scores: FuturenowScores): ProfileFlag[] {
  const T = FLAG_THRESHOLDS;
  const out: ProfileFlag[] = [];
  const push = (id: string, text: string) => out.push({ id, text });

  // ① 활력 — 새 임계를 만들지 않고 확정된 구간 판정을 그대로 쓴다.
  const zone = vitalityZone(scores.vitality.score).name;
  if (zone === '시들음') push('vitality-low', '활력 시들음 구간');
  if (zone === '번성') push('vitality-high', '활력 번성 구간');

  // ② 준비도 — 값은 GROW+F 다섯 축(각 1~5).
  const { G, R, O, W, F } = scores.grow;
  const grow = [G, R, O, W, F];
  const min = Math.min(...grow);
  const max = Math.max(...grow);
  // 둘은 수학적으로 함께 뜰 수 없다(최저 ≥ 4 면 편차가 1 이하다). 그래도 조건을 각각 쓴다 — 임계가 바뀌어도 옳다.
  if (min >= T.growEven) push('grow-even', '준비도 다섯 축 고르게 높음');
  if (max - min >= T.growSpread) push('grow-spread', '준비도 편차 큼');
  // 현실인식이 **단독** 선두이고 2위와 벌어져 있을 때만.
  const exceptR = Math.max(G, O, W, F);
  if (R === max && R - exceptR >= T.realismLead) push('realism-lead', '현실인식이 준비도 중 두드러지게 높음');
  // 정체성이 **단독** 최저일 때만(공동 최저는 해당 없음).
  if ([G, R, O, W].every((v) => v > F)) push('identity-lowest', '정체성이 준비도 중 단독 최저');
  if (O <= T.oneThingLow) push('onething-low', '원씽 낮음');

  // ③ 다섯 영역 — 값이 **높을수록 이상에 가깝다**(0~10). 그래서 낮은 축이 뒤처진 영역이다.
  const gaps = [scores.gap.B1, scores.gap.B2, scores.gap.B3, scores.gap.B4, scores.gap.B5];
  const gapMin = Math.min(...gaps);
  const rest = gaps.filter((_, i) => i !== gaps.indexOf(gapMin)); // 최저 한 자리만 빼고 나머지 넷
  const restAvg = rest.reduce((a, b) => a + b, 0) / rest.length;
  if (restAvg - gapMin >= T.gapSink) push('gap-sink', '한 영역만 깊이 함몰');
  if (scores.gap.B3 >= T.warmHigh && scores.gap.B5 >= T.warmHigh) push('warm-high', '관계·기여 점수 높음');

  // ④ 나침반 — 좌1 ~ 우5(3=중립). 좌우가 함께 뜰 수 있다(둘씩 갈린 경우).
  const nav = [scores.compass.NAV1, scores.compass.NAV2, scores.compass.NAV3, scores.compass.NAV4];
  if (nav.filter((v) => v <= T.compassLow).length >= T.compassCount) push('compass-left', '나침반 좌측 쏠림');
  if (nav.filter((v) => v >= T.compassHigh).length >= T.compassCount) push('compass-right', '나침반 우측 지향');

  return out;
}

/** 플래그가 없을 때 쓰는 문구. 구획을 숨기지 않는 이유는 계산이 돌았다는 사실 자체가 정보이기 때문이다. */
export const NO_FLAGS_TEXT = '두드러진 특징 없음';

/** 캡션 — 역할 분리를 화면에서 못 박는다(ORDER §4.2 필수). */
export const FLAGS_CAPTION =
  '이 특징들을 인도자 가이드의 ‘원형 빠른 식별표’와 대조해 원형 가설을 세우세요. 원형은 코드가 판정하지 않습니다 — 확정은 인도자의 몫입니다.';
