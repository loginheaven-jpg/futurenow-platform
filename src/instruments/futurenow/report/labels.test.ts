import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { vitalityZone, VITALITY_ZONES, GROW_AXES, GAP_AXES, COMPASS_AXES, careBanner, CARE_TONE, CARE_VAR } from './labels';
import type { FuturenowScores } from '../scoring';

describe('vitalityZone (활력 명명 — 측정→강의는 리포트에서만)', () => {
  it('≤10 → 시들음(care) [확정]', () => {
    expect(vitalityZone(5)).toMatchObject({ name: '시들음', tone: 'care' });
    expect(vitalityZone(10)).toMatchObject({ name: '시들음', tone: 'care' });
  });
  it('11~17 → 중간, 18~25 → 번성 (§5.4, 경계 확정 2026-06-28)', () => {
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

// 돌봄 배너 — 트리거 판정과 색. 시안 docs/tasks/care_banner_types.html 이 기준이다.
describe('careBanner (돌봄 배너 — 우선순위와 트리거별 색)', () => {
  const scores = (over: Partial<FuturenowScores> = {}): FuturenowScores => ({
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

  it('신호가 없으면 배너를 그리지 않는다', () => {
    expect(careBanner(scores())).toBeNull();
  });

  it('우선순위 byVitality > byCareCheck > 시들음 — 겹쳐도 하나만', () => {
    const all = scores({
      vitality: { score: 8, low: true },
      redFlag: { triggered: true, byVitality: true, byCareCheck: true },
    });
    expect(careBanner(all)?.kind).toBe('byVitality');

    const care = scores({
      vitality: { score: 8, low: true },
      redFlag: { triggered: true, byVitality: false, byCareCheck: true },
    });
    expect(careBanner(care)?.kind).toBe('byCareCheck');

    expect(careBanner(scores({ vitality: { score: 8, low: true } }))?.kind).toBe('languish');
  });

  it('byVitality 와 시들음은 제목이 같아도 다른 종류다(총점 무관 vs 총점 낮음)', () => {
    const vit = careBanner(scores({ redFlag: { triggered: true, byVitality: true, byCareCheck: false } }));
    const lang = careBanner(scores({ vitality: { score: 8, low: true } }));
    expect(vit?.title).toBe(lang?.title); // 문안은 같다
    expect(vit?.kind).not.toBe(lang?.kind); // 그래서 색으로 갈린다
    expect(CARE_TONE[vit!.kind].fill).not.toBe(CARE_TONE[lang!.kind].fill);
  });

  it('세 종류의 색이 서로 겹치지 않는다', () => {
    expect(new Set(Object.values(CARE_TONE).map((t) => t.fill)).size).toBe(3);
    expect(new Set(Object.values(CARE_VAR)).size).toBe(3); // 화면 변수 접두어도 셋
  });
});

// 시안 ↔ CSS ↔ 코드 삼중 잠금. 스냅숏이 아니라 **원본 문서를 직접 읽어** 대조한다 —
//   시안을 고치고 코드를 안 고치면(또는 그 반대면) 여기서 걸린다.
describe('돌봄 배너 색 — 시안·globals.css·CARE_TONE 삼중 대조', () => {
  const sian = readFileSync(new URL('../../../../docs/tasks/care_banner_types.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../../../app/globals.css', import.meta.url), 'utf8');
  const varOf = (src: string, name: string) => src.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]?.toLowerCase();

  // 시안 변수명 ↔ 우리 종류. 시안은 색 이름(amber/blue/gray)으로, 코드는 트리거 이름으로 부른다.
  const MAP = [
    { kind: 'byVitality', sianPrefix: 'amber', cssPrefix: 'vit' },
    { kind: 'byCareCheck', sianPrefix: 'blue', cssPrefix: 'req' },
    { kind: 'languish', sianPrefix: 'gray', cssPrefix: 'lang' },
  ] as const;

  it.each(MAP)('$kind — 시안 $sianPrefix 와 --care-$cssPrefix-* 와 CARE_TONE 이 같다', ({ kind, sianPrefix, cssPrefix }) => {
    const tone = CARE_TONE[kind];
    // 시안: --amber-bg / --amber-line / --amber-ink
    expect(varOf(sian, `${sianPrefix}-bg`)).toBe(tone.fill);
    expect(varOf(sian, `${sianPrefix}-line`)).toBe(tone.line);
    expect(varOf(sian, `${sianPrefix}-ink`)).toBe(tone.text);
    // 시안 본문색은 .b-amber .bbody 처럼 규칙 안에 있다.
    expect(sian.match(new RegExp(`\\.b-${sianPrefix} \\.bbody\\{color:(#[0-9a-fA-F]{6})`))?.[1]?.toLowerCase()).toBe(tone.body);
    // globals.css: --care-vit-fill / -line / -text / -body
    expect(varOf(css, `care-${cssPrefix}-fill`)).toBe(tone.fill);
    expect(varOf(css, `care-${cssPrefix}-line`)).toBe(tone.line);
    expect(varOf(css, `care-${cssPrefix}-text`)).toBe(tone.text);
    expect(varOf(css, `care-${cssPrefix}-body`)).toBe(tone.body);
    // 화면 컴포넌트가 그 접두어를 실제로 쓴다.
    expect(CARE_VAR[kind]).toBe(cssPrefix);
  });

  it('시안이 말하는 트리거 이름이 코드의 종류와 같다', () => {
    expect(sian).toContain('byVitality');
    expect(sian).toContain('byCareCheck');
    // 시안 주기: byVitality ≠ 시들음. 코드도 둘을 다른 종류로 가른다.
    expect(sian).toContain('byVitality ≠ 시들음');
    expect(Object.keys(CARE_TONE)).toEqual(['byVitality', 'byCareCheck', 'languish']);
  });
});
