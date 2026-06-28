import { describe, expect, it } from 'vitest';
import { participantMirror } from './participantMirror';
import type { FuturenowScores } from './scoring';

const baseScores = (over: Partial<FuturenowScores> = {}): FuturenowScores => ({
  vitality: { score: 15, low: false },
  redFlag: { triggered: false, byVitality: false, byCareCheck: false },
  grow: { G: 3, R: 3, O: 3, W: 3, F: 3, faithAux: { F1: null, F2: null } },
  trap: { D1: 1, D2: 1, D3: 1, primary: 'D1' },
  compass: { NAV1: 3, NAV2: 3, NAV3: 3, NAV4: 3 },
  gap: { B1: 5, B2: 5, B3: 5, B4: 5, B5: 5 },
  faith: { F1: null, F2: null },
  subjective: { E1: '', E2: '', E3: '' },
  ...over,
});

describe('participantMirror (갈망 거울 — 측정 미노출)', () => {
  it('저활력(≤10) → 낮음행 갈망, 버킷 라벨·숫자 0', () => {
    const m = participantMirror(baseScores({ vitality: { score: 8, low: true } }));
    expect(m.longing).toBe('지금 당신은 더 깊이 살아있기를 갈망하고 있어요.');
    expect(JSON.stringify(m)).not.toMatch(/시들음|번성|위기|\d/); // 버킷 라벨·점수·등급 0
  });

  it('중간활력(11~17) → 중간행', () => {
    const m = participantMirror(baseScores({ vitality: { score: 14, low: false } }));
    expect(m.longing).toBe('당신은 지금 자리에서 한 걸음을 가만히 그리고 있어요.');
  });

  it('고활력(≥18) → 높음행', () => {
    const m = participantMirror(baseScores({ vitality: { score: 22, low: false } }));
    expect(m.longing).toBe('당신 안에 살아있음이 차오르고 있어요. 그 감각을 기억해 두세요.');
  });

  it('dominant lean = |점수−3| 최대 축의 지향(우극·좌극)', () => {
    // NAV3=5 가 가장 치우침 → 우극
    expect(participantMirror(baseScores({ compass: { NAV1: 3, NAV2: 4, NAV3: 5, NAV4: 2 } })).direction).toBe(
      '지금 당신의 마음은 앞날을 향한 마음 쪽으로 향하고 있어요.',
    );
    // NAV4=1 가 가장 치우침 → 좌극
    expect(participantMirror(baseScores({ compass: { NAV1: 3, NAV2: 3, NAV3: 3, NAV4: 1 } })).direction).toBe(
      '지금 당신의 마음은 단단히 뿌리내리는 마음 쪽으로 향하고 있어요.',
    );
  });

  it('믿음 한 줄은 F1·F2 모두 응답 시에만', () => {
    expect(participantMirror(baseScores({ faith: { F1: 4, F2: 5 } })).faith).toBe(
      '당신이 붙잡고 있는 그 믿음이, 앞으로의 길에 빛이 되기를 바라요.',
    );
    expect(participantMirror(baseScores({ faith: { F1: 4, F2: null } })).faith).toBeUndefined();
    expect(participantMirror(baseScores({ faith: { F1: null, F2: null } })).faith).toBeUndefined();
  });
});
