import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { profileFlags, FLAG_THRESHOLDS, NO_FLAGS_TEXT, FLAGS_CAPTION } from './profileFlags';
import { VITALITY_ZONES } from './labels';
import type { FuturenowScores } from '../scoring';

// 전 축 중립 — 여기서 출발해 필요한 축만 흔든다. 이 상태에서는 플래그가 하나도 안 뜬다.
const flat = (over: Partial<FuturenowScores> = {}): FuturenowScores => ({
  vitality: { score: 15, low: false },
  redFlag: { triggered: false, byVitality: false, byCareCheck: false },
  grow: { G: 3, R: 3, O: 3, W: 3, F: 3, faithAux: { F1: null, F2: null } },
  trap: { D1: 2, D2: 1, D3: 1, primary: 'D1' },
  compass: { NAV1: 3, NAV2: 3, NAV3: 3, NAV4: 3 },
  gap: { B1: 5, B2: 5, B3: 5, B4: 5, B5: 5 },
  faith: { F1: null, F2: null },
  subjective: { E1: '', E2: '', E3: '' },
  ...over,
});
const grow = (G: number, R: number, O: number, W: number, F: number) => ({ G, R, O, W, F, faithAux: { F1: null, F2: null } });
const ids = (s: FuturenowScores) => profileFlags(s).map((f) => f.id);
const texts = (s: FuturenowScores) => profileFlags(s).map((f) => f.text);

describe('profileFlags (인도자 프로파일 특징 — 원형 재료)', () => {
  it('§5-6 아무 조건도 안 맞으면 빈 배열', () => {
    expect(profileFlags(flat())).toEqual([]);
  });

  // ORDER §5-1 대표 프로파일 — 현실인식 4.0 홀로 높음 · 정체성 2.0 최저 · 원씽 2.5
  it('§5-1 대표 프로파일: 현실인식 두드러짐 · 정체성 단독 최저 · 원씽 낮음', () => {
    const got = ids(flat({ grow: grow(2, 4, 2.5, 3, 2) }));
    expect(got).toContain('realism-lead');
    expect(got).toContain('onething-low');
    expect(got).toContain('grow-spread'); // 4 − 2 = 2 ≥ 2
    // F(2.0)가 G(2.0)와 공동 최저다 — '단독' 최저가 아니므로 뜨지 않는다.
    expect(got).not.toContain('identity-lowest');
    // 조건 미달은 안 뜬다.
    expect(got).not.toContain('grow-even');
    expect(got).not.toContain('vitality-low');
    expect(got).not.toContain('compass-left');
  });

  it('정체성 단독 최저는 F 가 홀로 낮을 때만', () => {
    expect(ids(flat({ grow: grow(3, 4, 3, 3, 2) }))).toContain('identity-lowest');
    expect(ids(flat({ grow: grow(2, 4, 3, 3, 2) }))).not.toContain('identity-lowest'); // G 와 공동 최저
  });

  it('현실인식 두드러짐은 단독 선두 + 2위와 벌어짐이 함께여야 한다', () => {
    expect(ids(flat({ grow: grow(2, 4, 2, 3, 2) }))).toContain('realism-lead'); // 4 vs 3 → 1
    expect(ids(flat({ grow: grow(2, 4, 2, 3.5, 2) }))).not.toContain('realism-lead'); // 4 vs 3.5 → 0.5
    expect(ids(flat({ grow: grow(4, 4, 2, 2, 2) }))).not.toContain('realism-lead'); // 공동 선두
  });

  it('준비도 고르게 높음과 편차 큼은 함께 뜰 수 없다', () => {
    const even = ids(flat({ grow: grow(4, 5, 4, 4.5, 4) }));
    expect(even).toContain('grow-even');
    expect(even).not.toContain('grow-spread');
  });

  it('한 영역만 깊이 함몰 — 나머지 넷 평균과의 차', () => {
    expect(ids(flat({ gap: { B1: 2, B2: 6, B3: 7, B4: 6, B5: 5 } }))).toContain('gap-sink'); // 평균 6 − 2 = 4
    expect(ids(flat({ gap: { B1: 4, B2: 6, B3: 6, B4: 6, B5: 6 } }))).not.toContain('gap-sink'); // 6 − 4 = 2
  });

  it('관계·기여 점수 높음 — B3·B5 **둘 다** 기준 이상', () => {
    expect(ids(flat({ gap: { B1: 3, B2: 3, B3: 8, B4: 3, B5: 7 } }))).toContain('warm-high');
    expect(ids(flat({ gap: { B1: 3, B2: 3, B3: 8, B4: 3, B5: 6 } }))).not.toContain('warm-high');
  });

  it('나침반 좌·우는 각각 두 축 이상일 때, 둘이 함께 뜰 수도 있다', () => {
    expect(ids(flat({ compass: { NAV1: 2, NAV2: 1, NAV3: 3, NAV4: 3 } }))).toContain('compass-left');
    expect(ids(flat({ compass: { NAV1: 2, NAV2: 3, NAV3: 3, NAV4: 3 } }))).not.toContain('compass-left'); // 한 축뿐
    const split = ids(flat({ compass: { NAV1: 1, NAV2: 2, NAV3: 5, NAV4: 4 } }));
    expect(split).toContain('compass-left');
    expect(split).toContain('compass-right');
  });

  it('표시 순서 = 활력 → 준비도 → 간격 → 나침반', () => {
    const got = ids(
      flat({
        vitality: { score: 8, low: true },
        grow: grow(2, 4, 2, 3, 1),
        gap: { B1: 1, B2: 8, B3: 8, B4: 8, B5: 8 },
        compass: { NAV1: 1, NAV2: 2, NAV3: 3, NAV4: 3 },
      }),
    );
    const group = (id: string) =>
      id.startsWith('vitality') ? 0 : id.startsWith('grow') || ['realism-lead', 'identity-lowest', 'onething-low'].includes(id) ? 1 : id.startsWith('gap') || id === 'warm-high' ? 2 : 3;
    const order = got.map(group);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(order).size).toBe(4); // 네 무리가 다 떴다
  });

  // 활력 임계를 사본으로 두지 않았음을 구조로 증명한다.
  it('활력 판정은 확정된 구간(VITALITY_ZONES)을 그대로 쓴다 — 사본 없음', () => {
    const languish = VITALITY_ZONES.find((z) => z.name === '시들음')!;
    const thrive = VITALITY_ZONES.find((z) => z.name === '번성')!;
    expect(ids(flat({ vitality: { score: languish.to, low: true } }))).toContain('vitality-low');
    expect(ids(flat({ vitality: { score: languish.to + 1, low: false } }))).not.toContain('vitality-low');
    expect(ids(flat({ vitality: { score: thrive.from, low: false } }))).toContain('vitality-high');
    expect(ids(flat({ vitality: { score: thrive.from - 1, low: false } }))).not.toContain('vitality-high');
    // 임계 상수 표에 활력이 없다 — 있었다면 경계가 두 곳이 된다.
    expect(Object.keys(FLAG_THRESHOLDS).some((k) => k.toLowerCase().includes('vitality'))).toBe(false);
  });

  // ORDER §2-1 · §5-2 — 코드에도 화면 문구에도 원형 이름이 없다.
  it('§5-2 원형 이름이 어디에도 없다(회귀 방지)', () => {
    const ARCHETYPES = ['명료한 정체형', '조용한 시들음형', '질주하는 회피형', '준비된 도약형', '따뜻한 표류형', '원형형'];
    const src = readFileSync(new URL('./profileFlags.ts', import.meta.url), 'utf8');
    const panel = readFileSync(new URL('./FacilitatorPanel.tsx', import.meta.url), 'utf8');
    for (const name of ARCHETYPES) {
      expect(src, `${name} 이 소스에 있다`).not.toContain(name);
      expect(panel, `${name} 이 패널에 있다`).not.toContain(name);
    }
    // 조건을 다 켠 프로파일에서도 문구는 축의 사실뿐이다.
    const loud = texts(flat({ vitality: { score: 8, low: true }, grow: grow(2, 4, 2, 3, 1), gap: { B1: 1, B2: 8, B3: 8, B4: 8, B5: 8 }, compass: { NAV1: 1, NAV2: 2, NAV3: 3, NAV4: 3 } }));
    for (const name of ARCHETYPES) expect(loud.join(' ')).not.toContain(name);
    // 캡션이 역할 분리를 명시한다.
    expect(FLAGS_CAPTION).toContain('원형은 코드가 판정하지 않습니다');
    expect(NO_FLAGS_TEXT).toBe('두드러진 특징 없음');
  });

  // ORDER §2-2 · §2-3 — 채점·AI 층에 새지 않았다.
  it('§5-4·5-5 채점·AI 층에 플래그가 없다', () => {
    const scoring = readFileSync(new URL('../scoring.ts', import.meta.url), 'utf8');
    const interp = readFileSync(new URL('./interpretation.ts', import.meta.url), 'utf8');
    for (const src of [scoring, interp]) {
      expect(src).not.toContain('profileFlags');
      expect(src).not.toContain('프로파일 특징');
    }
  });
});
