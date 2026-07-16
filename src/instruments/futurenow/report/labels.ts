// 리포트(B③) 명명 — 측정→강의 어휘는 **여기서만** 부여(§5/§9.4). 평어체. scoring 출력엔 구인 식별자만.
// 활력 구간명·경계 확정(directive 2026-06-28): 시들음 5~10 · 중간 11~17 · 번성 18~25.
// (시들음 ≤10 은 채점 사양 §9.3 규칙1 과 결속, 중간/번성 경계는 지휘부 확정.)
import type { FuturenowScores } from '../scoring';

export const VITALITY_RANGE = { min: 5, max: 25 } as const;

export interface VitalityZone {
  name: string;
  tone: 'care' | 'neutral';
  from: number;
  to: number;
  color: string; // 저채도 구간색(§5.4)
}
export const VITALITY_ZONES: VitalityZone[] = [
  { name: '시들음', tone: 'care', from: 5, to: 10, color: 'var(--languish-soft)' },
  { name: '중간', tone: 'neutral', from: 11, to: 17, color: 'var(--mid-soft)' },
  { name: '번성', tone: 'neutral', from: 18, to: 25, color: 'var(--thrive-soft)' },
];
export function vitalityZone(score: number): VitalityZone {
  return VITALITY_ZONES.find((z) => score >= z.from && score <= z.to) ?? VITALITY_ZONES[1];
}

// 나침반 4축(NAV1~4) — 좌1~우5. 우측이 접근·자기기준·미래·제로베이스(바람직 방향).
export const COMPASS_AXES = [
  { code: 'NAV1', label: '동기' },
  { code: 'NAV2', label: '기준' },
  { code: 'NAV3', label: '시선' },
  { code: 'NAV4', label: '리셋' },
] as const;

// 준비도 GROW+F — 각 1~5
export const GROW_AXES = [
  { key: 'G', label: '조감도' },
  { key: 'R', label: '현실인식' },
  { key: 'O', label: '원씽' },
  { key: 'W', label: '피드백' },
  { key: 'F', label: '정체성' },
] as const;

// 다섯 영역의 간격(B1~B5) — 각 0~10
export const GAP_AXES = [
  { code: 'B1', label: '일' },
  { code: 'B2', label: '재정' },
  { code: 'B3', label: '관계' },
  { code: 'B4', label: '건강' },
  { code: 'B5', label: '기여' },
] as const;

export const SUBJECTIVE_LABELS = { E1: '기대', E2: '정서', E3: '요청' } as const;

// 함정 유형(D1~D3) — 인도자 전용 강의 어휘(소그룹 편성 참고). 참여자 미노출. 최고점=주 함정, 동점 D1>D2>D3. ADR-77
export const TRAP_AXES = [
  { code: 'D1', label: '관성' },
  { code: 'D2', label: '준비' },
  { code: 'D3', label: '안주' },
] as const;

// 믿음의 자리(F1·F2) — 점수화하지 않는 목회적 신호. 무응답 가능(null). ADR-77
export const FAITH_LABELS = { F1: '의미', F2: '실행' } as const;

// 돌봄 신호 배너(§5.5) — 활력 시들음 OR Red Flag OR 돌봄 체크 시에만. 없으면 null(배너 미렌더).
// 경보·낙인 아님 — 우선순위 안내. 의미색 저채도(--care-*).
export function careBanner(scores: FuturenowScores): { title: string; body: string } | null {
  if (scores.redFlag.byVitality) {
    return {
      title: '돌봄 권장 · 개별 안부를 권합니다',
      body: '활력 신호가 낮습니다. 점수나 문항은 보이지 말고, 따뜻한 1:1로 먼저 안부를 건네 주세요.',
    };
  }
  if (scores.redFlag.byCareCheck) {
    return {
      title: '돌봄 권장 · 1:1 코칭을 요청했습니다',
      body: '참여자가 개별 연결을 원합니다. 편한 때 먼저 연락해 주세요.',
    };
  }
  if (scores.vitality.low) {
    return {
      title: '돌봄 권장 · 개별 안부를 권합니다',
      body: '활력이 시들음 구간입니다. 낙인이 아니라 돌봄 신호입니다 — 가벼운 안부를 권합니다.',
    };
  }
  return null;
}
