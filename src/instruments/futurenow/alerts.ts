// B④ 알림 트리거 — AlertPlugin 구현 (순수 함수). architecture §9.3 규칙 ②(Red Flag·돌봄).
//
// 규칙 ②: A2·A5·A4 모두 4~5 → red_flag · 돌봄 체크 → care. 둘 다면 red_flag 우선(더 높은 위중도).
// 점수·원문 미적재 — reason 은 **구인 수준 명명만**(어휘 분리, §9.4).
//
// 주의(계약 마찰): AlertInput 은 responseId·cohortId 를 요구하나 evaluate(scores) 는 그 맥락을 모른다.
//   → 여기서는 빈 문자열로 두고, 코어 오케스트레이션이 saveResponse 직후 주입한 뒤 raiseAlert 한다.
//   (보고 4항에 마찰로 명시 — 계약 임의 변경 안 함.)
import type { AlertInput, AlertPlugin } from '@/contracts';
import type { FuturenowScores } from './scoring';

export const futurenowAlerts: AlertPlugin<FuturenowScores> = {
  evaluate(scores: FuturenowScores): AlertInput[] {
    const ctxFields = { responseId: '', cohortId: '' }; // 코어가 주입
    if (scores.redFlag.byVitality) {
      return [{ ...ctxFields, severity: 'red_flag', reason: '활력 위기신호' }];
    }
    if (scores.redFlag.byCareCheck) {
      return [{ ...ctxFields, severity: 'care', reason: '돌봄 요청 신호' }];
    }
    return [];
  },
};
