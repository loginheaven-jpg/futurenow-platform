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

/** 코드 라벨·이니셜 배지용 모노 스택. 전용 토큰이 없어 스택을 직접 쓴다(시안들과 같은 스택). */
export const MONO_STACK = '"SF Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

export type GrowKey = (typeof GROW_AXES)[number]['key'];

/**
 * 준비도 축의 강조 — 지렛대(최고점) · 바닥(F 정체성) · 나머지.
 *
 * `lever`(지렛대)는 **강점에서 대화를 연다**는 코칭 동선이고, `floor`(바닥)는 F 가 나머지 넷을
 * 떠받친다는 뜻이다. 둘이 겹치면 지렛대가 이긴다 — F 가 최고점이면 그 축은 이미 강점이다.
 */
export type GrowEmphasis = 'lever' | 'floor' | 'plain';

/**
 * 최고점은 **런타임 계산**이다(하드코딩 금지 · ORDER report_cards_v1 §3.2).
 * 동점이면 해당 축 모두 지렛대다.
 */
export function growEmphasis(grow: FuturenowScores['grow']): Record<GrowKey, GrowEmphasis> {
  const keys = GROW_AXES.map((a) => a.key);
  const top = Math.max(...keys.map((k) => grow[k]));
  const out = {} as Record<GrowKey, GrowEmphasis>;
  // 지렛대를 먼저 본다 — 그래야 F 가 최고점일 때 초록이 금색을 이긴다.
  for (const k of keys) out[k] = grow[k] === top ? 'lever' : k === 'F' ? 'floor' : 'plain';
  return out;
}

/**
 * 강조별 색. 화면(CSS 변수)과 PDF(react-pdf, var 미지원)가 **한 표**를 본다 — CARE_TONE 과 같은 이유다.
 *
 * 시안(`docs/tasks/readiness_growf_badges.html`)의 하드코딩 색 대신 **디자인 토큰**을 쓴다(ORDER §3.2 지시).
 * 글자색이 배경마다 다른 이유는 대비다 — 흰 글자는 금색 위에서 2.79:1 로 미달하고(globals.css §1.2 기록),
 * 시안 초록(#2f8f6b) 위에서도 3.99:1 로 미달한다. 토큰 초록(#2e7d6b)은 4.93:1, 금색+네이비는 5.18:1 이다.
 */
export const GROW_TONE: Record<GrowEmphasis, { css: { fill: string; ink: string }; pdf: { fill: string; ink: string } }> = {
  lever: { css: { fill: 'var(--color-success)', ink: 'var(--color-text-on-accent)' }, pdf: { fill: '#2E7D6B', ink: '#FFFFFF' } },
  floor: { css: { fill: 'var(--color-accent)', ink: 'var(--color-text-on-gold)' }, pdf: { fill: '#C8911F', ink: '#1A3A5C' } },
  plain: { css: { fill: 'var(--color-primary)', ink: 'var(--color-text-on-accent)' }, pdf: { fill: '#1B2A41', ink: '#FFFFFF' } },
};

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

/**
 * 어느 트리거로 배너가 켜졌는가. 셋이 겹쳐도 하나만 뜨므로(우선순위) 화면에서는 이유가 안 보인다.
 * 그 이유를 **색으로** 되돌려 주려고 종류를 함께 내보낸다(시안: docs/tasks/care_banner_types.html).
 *
 * `byVitality` 와 `languish` 는 다르다 — 앞은 마모 세 문항이 모두 높은 상태(총점 무관, Red Flag),
 * 뒤는 활력 **총점**이 낮은 상태(Red Flag 아님)다. 제목이 같아 섞이기 쉬운 자리라 종류로 갈라 둔다.
 */
export type CareKind = 'byVitality' | 'byCareCheck' | 'languish';

// 돌봄 신호 배너(§5.5) — 활력 시들음 OR Red Flag OR 돌봄 체크 시에만. 없으면 null(배너 미렌더).
// 경보·낙인 아님 — 우선순위 안내. 의미색 저채도(--care-vit/req/lang-*).
export function careBanner(scores: FuturenowScores): { kind: CareKind; title: string; body: string } | null {
  if (scores.redFlag.byVitality) {
    return {
      kind: 'byVitality',
      title: '돌봄 권장 · 개별 안부를 권합니다',
      body: '활력 신호가 낮습니다. 점수나 질문은 보이지 말고, 따뜻한 1:1로 먼저 안부를 건네 주세요.',
    };
  }
  if (scores.redFlag.byCareCheck) {
    return {
      kind: 'byCareCheck',
      title: '돌봄 권장 · 1:1 코칭을 요청했습니다',
      body: '참여자가 개별 연결을 원합니다. 편한 때 먼저 연락해 주세요.',
    };
  }
  if (scores.vitality.low) {
    return {
      kind: 'languish',
      title: '돌봄 권장 · 개별 안부를 권합니다',
      body: '활력이 시들음 구간입니다. 낙인이 아니라 돌봄 신호입니다 — 가벼운 안부를 권합니다.',
    };
  }
  return null;
}

/** 트리거별 배너 색. 화면(CSS 변수)과 PDF(리터럴)가 같은 표를 보도록 여기 한 곳에 둔다. */
export const CARE_TONE: Record<CareKind, { fill: string; line: string; text: string; body: string }> = {
  byVitality: { fill: '#fbf4e9', line: '#e6cfa6', text: '#8a6a2f', body: '#7a6134' },
  byCareCheck: { fill: '#eef3fb', line: '#c6d6ee', text: '#345088', body: '#42588a' },
  languish: { fill: '#f2f4f7', line: '#d9dee7', text: '#5a6472', body: '#5a6472' },
};

/** 화면용 CSS 변수 접두어. globals.css 의 --care-{vit|req|lang}-* 과 짝이다. */
export const CARE_VAR: Record<CareKind, string> = {
  byVitality: 'vit',
  byCareCheck: 'req',
  languish: 'lang',
};
