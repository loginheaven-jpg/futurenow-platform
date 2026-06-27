// B② 채점 — ScoringPlugin 구현 (순수 함수, 부수효과 없음). architecture §9.3 7규칙.
//
// 측정/강의 어휘 분리(§9.4): 산출물에는 **구인 수준 식별자만**(vitality·GROW축·D코드·NAV·B).
// '시들음'·'원씽' 같은 강의 명명은 여기 두지 않는다 — B③ 리포트에서만 명명한다.
//
// 역채점(6 − x, likert 1~5)은 A2·A5·A4(활력)·C5(GROW O)에만 적용한다(전용노선과 동일).
// 함정(D1·D2·D3)은 rule ④에서 **원점수 최고점**으로 판정한다(역채점 대상 아님).
import type { Answers, ScoringPlugin } from '@/contracts';

export interface GrowScores {
  G: number;
  R: number;
  O: number;
  W: number;
  F: number;
}

export interface FuturenowScores {
  // ① 활력 지수 5~25. low = ≤10 (B③에서 '시들음'으로 명명 — 여기선 명명 금지)
  vitality: { score: number; low: boolean };
  // ② Red Flag — B④ 트리거 근거
  redFlag: { triggered: boolean; byVitality: boolean; byCareCheck: boolean };
  // ③ 준비도 GROW+F (F 보조: F1·F2)
  grow: GrowScores & { faithAux: { F1: number | null; F2: number | null } };
  // ④ 함정 유형 (원점수 최고점 = 주 함정)
  trap: { D1: number; D2: number; D3: number; primary: 'D1' | 'D2' | 'D3' };
  // ⑤ 나침반 4축 (좌1~우5)
  compass: { NAV1: number; NAV2: number; NAV3: number; NAV4: number };
  // ⑥ 간격 레이더 (0~10)
  gap: { B1: number; B2: number; B3: number; B4: number; B5: number };
  // ⑦ 믿음의 자리 — 점수화하지 않음(목회적 신호로만). 무응답은 null
  faith: { F1: number | null; F2: number | null };
}

const avg = (a: number, b: number) => (a + b) / 2;

export function scoreFuturenow(answers: Answers): FuturenowScores {
  const n = (code: string): number => Number(answers[code]);
  const optN = (code: string): number | null => {
    const x = answers[code];
    return typeof x === 'number' ? x : null;
  };
  const rev = (code: string): number => 6 - n(code); // likert 1~5 역채점

  // ① 활력 지수: A1 + A3 + (6−A2) + (6−A5) + (6−A4)
  const vitalityScore = n('A1') + n('A3') + rev('A2') + rev('A5') + rev('A4');
  const vitality = { score: vitalityScore, low: vitalityScore <= 10 };

  // ② Red Flag: A2·A5·A4 모두 4~5점(원점수) 또는 돌봄 체크
  const byVitality = n('A2') >= 4 && n('A5') >= 4 && n('A4') >= 4;
  const byCareCheck = answers['CARE'] === true;
  const redFlag = { triggered: byVitality || byCareCheck, byVitality, byCareCheck };

  // ③ 준비도 GROW+F: G=avg(C2,C1)·R=avg(C3,C4)·O=avg(C6,6−C5)·W=avg(C8,C7)·F=C9
  const grow = {
    G: avg(n('C2'), n('C1')),
    R: avg(n('C3'), n('C4')),
    O: avg(n('C6'), rev('C5')),
    W: avg(n('C8'), n('C7')),
    F: n('C9'),
    faithAux: { F1: optN('F1'), F2: optN('F2') },
  };

  // ④ 함정 유형: D1·D2·D3 중 최고점(원점수). 동점 시 앞선 코드 우선
  const D1 = n('D1');
  const D2 = n('D2');
  const D3 = n('D3');
  const candidates: Array<['D1' | 'D2' | 'D3', number]> = [
    ['D1', D1],
    ['D2', D2],
    ['D3', D3],
  ];
  const primary = candidates.reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0];
  const trap = { D1, D2, D3, primary };

  // ⑤ 나침반 4축
  const compass = { NAV1: n('NAV1'), NAV2: n('NAV2'), NAV3: n('NAV3'), NAV4: n('NAV4') };

  // ⑥ 간격 레이더
  const gap = { B1: n('B1'), B2: n('B2'), B3: n('B3'), B4: n('B4'), B5: n('B5') };

  // ⑦ 믿음의 자리 — 점수화 안 함, 무응답 null
  const faith = { F1: optN('F1'), F2: optN('F2') };

  return { vitality, redFlag, grow, trap, compass, gap, faith };
}

export const futurenowScoring: ScoringPlugin<Answers, FuturenowScores> = {
  // pre·post 동일 채점(같은 코드·구인). wave(ctx)는 분기에 쓰지 않으므로 받지 않는다.
  score(answers: Answers): FuturenowScores {
    return scoreFuturenow(answers);
  },
};
