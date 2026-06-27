import { describe, it, expect } from 'vitest';
import { vitalityZone, VITALITY_ZONES, GROW_AXES, GAP_AXES, COMPASS_AXES } from './labels';

describe('vitalityZone (활력 명명 — 측정→강의는 리포트에서만)', () => {
  it('≤10 → 시들음(care) [확정]', () => {
    expect(vitalityZone(5)).toMatchObject({ name: '시들음', tone: 'care' });
    expect(vitalityZone(10)).toMatchObject({ name: '시들음', tone: 'care' });
  });
  it('11~17 → 중간, 18~25 → 번성 (§5.4, 경계 잠정)', () => {
    expect(vitalityZone(11).name).toBe('중간');
    expect(vitalityZone(17).name).toBe('중간');
    expect(vitalityZone(18).name).toBe('번성');
    expect(vitalityZone(25).name).toBe('번성');
  });
  it('zone 들이 5~25 를 빈틈없이 덮는다', () => {
    for (let v = 5; v <= 25; v++) {
      expect(VITALITY_ZONES.some((z) => v >= z.from && v <= z.to)).toBe(true);
    }
  });
});

describe('리포트 축 명명(구인 → 강의 어휘, B③ 전용)', () => {
  it('GROW+F 5축, 간격 5축, 나침반 4축', () => {
    expect(GROW_AXES.map((a) => a.key)).toEqual(['G', 'R', 'O', 'W', 'F']);
    expect(GAP_AXES.map((a) => a.code)).toEqual(['B1', 'B2', 'B3', 'B4', 'B5']);
    expect(COMPASS_AXES.map((a) => a.code)).toEqual(['NAV1', 'NAV2', 'NAV3', 'NAV4']);
    expect(GROW_AXES.find((a) => a.key === 'O')?.label).toBe('원씽'); // 강의 어휘는 리포트에서만
  });
});
