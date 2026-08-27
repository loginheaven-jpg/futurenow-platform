// 색 토큰 실측 잠금 — `design_system.md` §1.6 과 `globals.css` 가 갈리지 않게.
//   (3차 T-1 신설 → **4차 F-0 개편 반영**)
//
// **왜 테스트인가.** §1.6 은 "대비비"와 "같은 축 충돌"을 표로 적는다. 그 표는 손으로 옮겨 적은
//   수치이므로, 토큰을 하나 고치는 순간 문서가 조용히 거짓이 된다 — 이 저장소가 반복해서 데인
//   "사본이 둘"이다. 값은 `globals.css` 가 주인이고, 여기서 다시 계산해 문서와 대조한다.
//
// **F-0 이 게이트 ②를 여기로 옮겼다.** 발주 원안은 `--color-surface-2` 를 `--gray-100` 으로
//   올리면서 `--color-surface-sunken` 을 그대로 두어 **둘이 같은 값**이 됐다(입력창이 카드와 동색).
//   대비만 재고 축 충돌을 안 돌린 것이 원인이다. 그래서 이 파일이 **축까지 본다** —
//   같은 축에서 값이 겹치면, **§1.6 에 별칭으로 선언돼 있지 않은 한** 레드가 난다.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/app/globals.css', 'utf8');
const spec = readFileSync('design_system.md', 'utf8');

const decls: Record<string, string> = {};
for (const m of css.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) decls[`--${m[1]}`] = m[2].trim();

function resolve(v: string, depth = 0): string {
  const m = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i.exec(v.trim());
  return m && decls[m[1]] && depth < 12 ? resolve(decls[m[1]], depth + 1) : v.trim();
}
const hex = (token: string) => resolve(decls[token] ?? '').toLowerCase();

function luminance(h: string): number {
  const n = h.replace('#', '');
  const ch = [0, 2, 4]
    .map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(hex(a)), luminance(hex(b))].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}
const round = (n: number) => Math.round(n * 100) / 100;

/** 역할 토큰의 축. 값이 같아도 축이 다르면 구분 문제가 아니다(흰 배경 vs 네이비 면 위 흰 글자). */
function axisOf(token: string): '면' | '글자' | '테두리' | '브랜드' {
  if (/^--color-(bg|surface)/.test(token)) return '면';
  if (/^--color-text($|-)/.test(token)) return '글자';
  if (/^--color-border/.test(token)) return '테두리';
  return '브랜드';
}

// design_system.md §1.6 이 적은 수치. **문서를 고치면 여기도 고쳐야 하고, 그 반대도 같다.**
const DOCUMENTED: [string, string, number][] = [
  ['--color-text', '--color-bg', 16.6],
  ['--color-text', '--color-surface-2', 14.07],
  ['--color-text-secondary', '--color-bg', 5.77],
  ['--color-text-secondary', '--color-surface-2', 4.89],
  ['--color-text-muted', '--color-bg', 5.77],
  ['--color-text-muted', '--color-surface-2', 4.89],
  ['--color-text-on-accent', '--navy-700', 11.64],
  ['--color-text-on-accent', '--navy-900', 15.91],
  ['--color-accent-strong', '--navy-700', 5.75],
  ['--color-accent-strong', '--navy-900', 7.86],
  ['--color-text-on-gold', '--color-accent', 5.70],  // F-5 전 A안: navy-700(4.17 · AA 미달) → navy-900
  ['--color-surface-1', '--color-bg', 1.08],
  ['--color-surface-2', '--color-bg', 1.18],
  ['--color-surface-sunken', '--color-surface-2', 1.11],
  ['--color-surface-input', '--color-surface-2', 1.11],
  ['--color-accent-soft', '--color-bg', 1.24],
  ['--color-border', '--color-bg', 1.39],
  ['--color-border', '--color-surface-2', 1.18],
  ['--color-border-strong', '--color-bg', 2.53],
];

/** §1.6 이 **선언한** 별칭 쌍. 여기 있으면 같은 축이어도 충돌로 세지 않는다. */
const DECLARED_ALIASES: [string, string][] = [
  ['--color-surface-input', '--color-surface-sunken'],
  ['--color-text-muted', '--color-text-secondary'],
];

describe('색 토큰 실측 — design_system §1.6 잠금', () => {
  it('문서에 적은 대비비가 globals.css 와 일치한다', () => {
    for (const [a, b, expected] of DOCUMENTED) {
      expect(round(ratio(a, b)), `${a} / ${b} — §1.6 표와 어긋난다`).toBe(expected);
    }
  });

  it('**F-0 이 §11 부채 셋을 닫았다** — 그 사실이 값으로 남아 있다', () => {
    // ① 면 위의 면: 카드가 배경과 갈린다(전에는 1.00 — 같은 흰색)
    expect(hex('--color-surface-2')).not.toBe(hex('--color-bg'));
    expect(round(ratio('--color-surface-2', '--color-bg'))).toBe(1.18);
    // ③ text-muted 가 §10 본문 기준(4.5)을 넘는다(전에는 2.53)
    expect(ratio('--color-text-muted', '--color-bg')).toBeGreaterThanOrEqual(4.5);
    // ② border-strong 과 text-muted 가 갈린다
    expect(hex('--color-border-strong')).not.toBe(hex('--color-text-muted'));
  });

  it('**같은 축 충돌은 §1.6 이 선언한 별칭뿐이다**(게이트 ②)', () => {
    const byValue: Record<string, string[]> = {};
    for (const k of Object.keys(decls)) {
      if (!/^--color-/.test(k)) continue;
      const v = resolve(decls[k]).toLowerCase();
      if (!/^#/.test(v)) continue; // 그라디언트(surface-inverse)는 단일 색이 아니다
      (byValue[v] ??= []).push(k);
    }
    const declared = new Set(DECLARED_ALIASES.map(([a, b]) => [a, b].sort().join('|')));
    const undeclared: string[] = [];
    for (const tokens of Object.values(byValue)) {
      if (tokens.length < 2) continue;
      for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
          if (axisOf(tokens[i]) !== axisOf(tokens[j])) continue; // 축이 다르면 충돌 아님
          if (declared.has([tokens[i], tokens[j]].sort().join('|'))) continue;
          undeclared.push(`${tokens[i]} = ${tokens[j]}`);
        }
      }
    }
    expect(undeclared, '선언되지 않은 같은 축 충돌이다 — 값을 고치거나 §1.6에 별칭으로 선언하라').toEqual([]);
  });

  it('**선언된 별칭은 문서에 실제로 적혀 있다**(게이트 ② 통과 조건)', () => {
    // 코드에만 선언하고 문서에 안 적으면 다음 사람이 "왜 같은 값인가"를 알 수 없다.
    const i = spec.indexOf('### 1.6 상태 대비 실측');
    expect(i, '§1.6 이 있어야 한다').toBeGreaterThan(-1);
    const j = spec.indexOf('\n---\n\n## 2. 타이포', i);
    const body = spec.slice(i, j);
    expect(body).toContain('선언된 별칭');
    for (const [a, b] of DECLARED_ALIASES) {
      expect(body, `${a} 별칭 선언이 §1.6 에 없다`).toContain(a);
      expect(body, `${b} 별칭 선언이 §1.6 에 없다`).toContain(b);
    }
  });

  it('그라디언트 면은 **최악단**으로 판정한다 — 글자가 가장 안 보이는 곳이 기준', () => {
    expect(decls['--color-surface-inverse'], 'surface-inverse 는 그라디언트다').toContain('linear-gradient');
    // navy-700 끝이 최악단이고 거기서도 기준을 넘어야 한다.
    expect(ratio('--color-text-on-accent', '--navy-700')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('--color-accent-strong', '--navy-700')).toBeGreaterThanOrEqual(3);
  });

  it('면 사다리가 단조 증가한다 — 깊이가 뒤집히지 않는다', () => {
    const depth = ['--color-bg', '--color-surface-1', '--color-surface-2', '--color-surface-sunken'];
    const lums = depth.map((t) => luminance(hex(t)));
    for (let i = 1; i < lums.length; i++) {
      expect(lums[i], `${depth[i]} 가 ${depth[i - 1]} 보다 어두워야 한다`).toBeLessThan(lums[i - 1]);
    }
  });
});
