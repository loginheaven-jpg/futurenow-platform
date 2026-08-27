// 색 토큰 실측 잠금 — `design_system.md` §1.6 과 `globals.css` 가 갈리지 않게.
//
// **왜 테스트인가.** §1.6 은 "값이 같은 쌍"과 "대비비"를 표로 적는다. 그 표는 손으로 옮겨 적은
//   수치이므로, 토큰을 하나 고치는 순간 문서가 조용히 거짓이 된다 — 이 저장소가 반복해서 데인
//   "사본이 둘"이다(ADR-112·114·119 계열). 값은 `globals.css` 가 주인이고, 여기서 다시 계산해
//   문서가 적은 것과 대조한다.
//
// **새 충돌도 잡는다.** 역할 토큰이 늘어 값이 같은 묶음이 하나라도 더 생기면 레드가 난다.
//   그때 할 일은 수치를 고치는 것이 아니라 **§1.6 금지 목록에 올릴지 판단하는 것**이다.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/app/globals.css', 'utf8');

const decls: Record<string, string> = {};
for (const m of css.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) decls[`--${m[1]}`] = m[2].trim();

/** `var(--a)` 사슬을 끝까지 풀어 최종 리터럴로. */
function resolve(v: string, depth = 0): string {
  const m = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i.exec(v.trim());
  return m && decls[m[1]] && depth < 12 ? resolve(decls[m[1]], depth + 1) : v.trim();
}
const hex = (token: string) => resolve(decls[token] ?? '').toLowerCase();

/** WCAG 상대 휘도 → 대비비. */
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

// design_system.md §1.6 이 적은 수치. **문서를 고치면 여기도 고쳐야 하고, 그 반대도 같다.**
const DOCUMENTED: [string, string, number][] = [
  ['--color-text', '--color-bg', 16.6],
  ['--color-text-secondary', '--color-bg', 5.77],
  ['--color-text-muted', '--color-bg', 2.53],
  ['--color-text-on-accent', '--color-primary', 11.64],
  ['--color-text-on-gold', '--color-accent', 4.17],
  ['--color-surface-1', '--color-bg', 1.08],
  ['--color-surface-sunken', '--color-bg', 1.18],
  ['--color-surface-2', '--color-bg', 1.0],
  ['--color-primary', '--color-bg', 11.64],
  ['--color-accent-soft', '--color-bg', 1.24],
  ['--color-border', '--color-bg', 1.39],
  ['--color-border-strong', '--color-bg', 2.53],
];

// §1.6 이 기록한 "값이 같은 묶음" 11. 아홉은 3단 구조(원천→역할)의 정상 별칭이고 둘이 급소다.
const KNOWN_COLLISIONS = 11;

describe('색 토큰 실측 — design_system §1.6 잠금', () => {
  it('문서에 적은 대비비가 globals.css 와 일치한다', () => {
    for (const [a, b, expected] of DOCUMENTED) {
      expect(round(ratio(a, b)), `${a} / ${b} — §1.6 표와 어긋난다`).toBe(expected);
    }
  });

  it('**`--color-surface-2` 는 `--color-bg` 와 같은 색이다** — 면 위의 면이 없다', () => {
    // §11 에 부채로 적어 둔 사실이다. 언젠가 이 단언이 깨지면 그것은 **부채가 갚혔다는 뜻**이고,
    //   그때 §1.6 금지 규칙과 §11 항목을 함께 걷어야 한다. 조용히 지나가지 않게 여기서 잡는다.
    expect(hex('--color-surface-2')).toBe(hex('--color-bg'));
    expect(round(ratio('--color-surface-2', '--color-bg'))).toBe(1.0);
  });

  it('면으로 상태를 가를 수단은 `--color-primary` 하나뿐이다', () => {
    // 나머지 면은 전부 배경과 1.3 미만이라 "선택됨"을 면색만으로 말할 수 없다.
    for (const t of ['--color-surface-1', '--color-surface-2', '--color-surface-sunken', '--color-accent-soft']) {
      expect(ratio(t, '--color-bg'), `${t} 로 상태를 가르지 말 것(§1.6)`).toBeLessThan(1.3);
    }
    expect(ratio('--color-primary', '--color-bg'), 'primary 면은 확실히 갈린다').toBeGreaterThan(4.5);
  });

  it('값이 같은 토큰 묶음이 늘지 않았다 — 늘면 §1.6 에 올릴지 판단한다', () => {
    const byValue: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(decls)) {
      if (!/^--color-|^--navy|^--gray|^--gold/.test(k)) continue;
      const r = resolve(v).toLowerCase();
      if (!/^#/.test(r)) continue;
      (byValue[r] ??= []).push(k);
    }
    const groups = Object.values(byValue).filter((ks) => ks.length > 1);
    expect(groups.length, '새 충돌이 생겼다면 수치를 고치지 말고 §1.6 금지 목록을 먼저 보라').toBe(KNOWN_COLLISIONS);
  });

  it('§10 이 정한 본문 대비(≥4.5)를 어기는 텍스트 토큰을 목록으로 안다', () => {
    // **고치지 않는다**(3차 §8-6). 다만 "모르고 있다"와 "알고 감수한다"는 다르므로 여기서 고정한다.
    //   `--color-text-muted` 는 2.53 으로 §10 의 본문 기준(4.5)도 큰 글씨 기준(3.0)도 넘지 못한다.
    //   §11 에 부채로 적어 두었다. 값을 올리면 이 단언이 깨지고, 그때 §11 항목을 걷는다.
    expect(ratio('--color-text', '--color-bg')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('--color-text-secondary', '--color-bg')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('--color-text-muted', '--color-bg'), '알려진 미달 — §11 부채').toBeLessThan(3);
  });
});
