// B④ 알림 트리거 — AlertPlugin 구현 (순수 함수). architecture §9.3 규칙 ②(Red Flag·돌봄).
//
// 규칙 ②: A2·A5·A4 모두 4~5 → red_flag · 돌봄 체크 → care. 둘 다면 red_flag 우선(더 높은 위중도).
// 점수·원문 미적재 — reason 은 **구인 수준 명명만**(어휘 분리, §9.4).
//
// 반환은 AlertSignal(severity·reason). responseId·cohortId 는 코어 오케스트레이션이 saveResponse 직후
// 주입해 완전한 AlertInput 을 구성하고 raiseAlert 한다(계약 정직화 — ADR-19).
import type { AlertPlugin, AlertSignal } from '@/contracts';
import type { FuturenowScores } from './scoring';

export const futurenowAlerts: AlertPlugin<FuturenowScores> = {
  evaluate(scores: FuturenowScores): AlertSignal[] {
    if (scores.redFlag.byVitality) {
      return [{ severity: 'red_flag', reason: '활력 위기신호' }];
    }
    if (scores.redFlag.byCareCheck) {
      return [{ severity: 'care', reason: '돌봄 요청 신호' }];
    }
    return [];
  },
};
