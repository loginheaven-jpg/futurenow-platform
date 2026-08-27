// ADR 채번 잠금 — **번호가 미아가 되지 않게** (2026-08-28).
//
// **왜 이 파일이 생겼나.** CLAUDE.md §11-3 이 *"새 결정은 ADR 로 번호를 이어 붙인다(중복·결번 확인)"*
//   라고 요구하는데, 그 확인을 **매번 손으로** 했다. 손으로 하는 확인은 세는 단위가 흔들리고,
//   실제로 흔들렸다 — 같은 표를 두고 `127` 과 `128`, 결번 `[12]` 와 `[12,115,116,117]` 이 나왔다.
//   갈린 이유는 **`| ADR-115~117 |` 범위 행**을 세느냐였다. 값이 아니라 단위가 문제였다
//   (`invariants.test.ts` 와 같은 교훈).
//
// **그리고 손 확인이 놓친 것이 있었다.** 보고서 둘이 결번 `ADR-12` 를 *"기존 상태"* 로 넘겼는데,
//   `design_system.md` §2 가 **ADR-12 를 살아 있는 근거로 인용하고 있다**
//   (*"브랜드 토큰은 진단이 주입, 중립·의미 토큰은 코어 소유(ADR-12)"*).
//   **결번이 아니라 미아 참조다** — 인용은 살아 있는데 정의가 없다.
//   3차 T-6 이 불변식에서 찾아낸 것과 같은 모양이고(참조 12개 · 정의 0), 그래서 같은 방식으로 잠근다.
//
// **이 파일이 막는 것** —
//   ⓐ 같은 번호를 두 번 쓴다(중복)
//   ⓑ 이유 없는 결번이 새로 생긴다
//   ⓒ 정의 없는 번호를 인용한다(미아 참조)
//   ⓓ 알려진 미아가 **조용히 눌러앉는다** — 해소되면 이 파일이 실패해서 예외를 지우게 만든다
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CANON = 'architecture.md';
const canon = readFileSync(CANON, 'utf8');

/**
 * 결번에는 **표에 적힌 이유**가 있어야 한다. 이유가 표에 없는 것만 여기 남긴다.
 * 비어 있는 것이 정상 상태다 — 한 줄이라도 남아 있으면 그 자체가 미결 표시다.
 */
const KNOWN_GAPS = new Map<number, string>([
  [
    12,
    'design_system.md §2 가 살아 있는 근거로 인용하는데 architecture.md 에 행이 없다. ' +
      '결번이 아니라 **미아 참조**다. 행을 되살리는 것은 정본 변경이라 지휘부 판정 사안이고, ' +
      '판정 전까지 이 줄이 그 사실을 기록한다(2026-08-28 발견).',
  ],
]);

/** `| ADR-73 |` 과 `| ADR-115~117 |` 두 형태를 모두 읽는다 — 세는 단위를 여기서 못 박는다. */
function definedNumbers(): number[] {
  const out: number[] = [];
  for (const m of canon.matchAll(/^\|\s*ADR-(\d+)(?:\s*~\s*(\d+))?\s*\|/gm)) {
    const a = Number(m[1]);
    const b = Number(m[2] ?? m[1]);
    for (let n = a; n <= b; n += 1) out.push(n);
  }
  return out;
}

/** 저장소에서 `ADR-73`·`ADR-04·75·78`·`ADR-13~16` 을 모두 펼쳐 모은다. */
function referencedNumbers(): Map<number, string[]> {
  const roots = ['architecture.md', 'design_system.md', 'plan.md', 'CLAUDE.md', 'docs', 'src', 'tests'];
  const found = new Map<number, string[]>();

  const walk = (p: string): void => {
    let st;
    try { st = statSync(p); } catch { return; }
    if (st.isDirectory()) {
      for (const e of readdirSync(p)) if (e !== 'node_modules' && !e.startsWith('.')) walk(join(p, e));
      return;
    }
    if (!/\.(md|ts|tsx|css|sql)$/.test(p)) return;
    for (const m of readFileSync(p, 'utf8').matchAll(/ADR-(\d+(?:[·~]\d+)*)/g)) {
      const g = m[1];
      const ns = g.includes('~')
        ? (() => { const [a, b] = g.split('~').map(Number); return Array.from({ length: b - a + 1 }, (_, i) => a + i); })()
        : g.split('·').map(Number);
      for (const n of ns) found.set(n, [...(found.get(n) ?? []), p.replace(/\\/g, '/')]);
    }
  };
  roots.forEach(walk);
  return found;
}

describe('ADR 채번 — 중복도 미아도 없다', () => {
  const defined = definedNumbers();
  const set = new Set(defined);
  const referenced = referencedNumbers();
  const max = Math.max(...defined);

  it('중복 채번이 없다 — 한 번호가 두 결정을 가리키면 인용이 어느 쪽인지 말할 수 없다', () => {
    const dup = [...new Set(defined.filter((n, i) => defined.indexOf(n) !== i))].sort((a, b) => a - b);
    expect(dup, `중복 ADR 번호: ${dup.join(' · ')}`).toEqual([]);
  });

  it('결번은 표가 이유를 대거나(예약 행) 여기 예외로 적혀 있다 — 이유 없는 결번 0', () => {
    const gaps = Array.from({ length: max }, (_, i) => i + 1).filter((n) => !set.has(n));
    const undeclared = gaps.filter((n) => !KNOWN_GAPS.has(n));
    expect(undeclared, `사유 없는 결번: ${undeclared.join(' · ')}`).toEqual([]);
  });

  it('**인용된 번호가 전부 정의돼 있다** — 알려진 미아 말고는 0', () => {
    const orphans = [...referenced.keys()].filter((n) => !set.has(n) && !KNOWN_GAPS.has(n)).sort((a, b) => a - b);
    expect(orphans, `정의 없는 ADR 인용: ${orphans.join(' · ')}`).toEqual([]);
  });

  it('알려진 미아가 해소되면 여기서 실패한다 — 예외가 눌러앉지 않게(ⓓ)', () => {
    const stale = [...KNOWN_GAPS.keys()].filter((n) => set.has(n));
    expect(stale, `정의가 생겼으니 KNOWN_GAPS 에서 지워라: ADR-${stale.join(' · ADR-')}`).toEqual([]);
  });

  it('예외에는 사유가 붙어 있다 — 번호만 적힌 예외는 다음 사람이 판단할 수 없다', () => {
    for (const [n, why] of KNOWN_GAPS) {
      expect(why.length, `ADR-${n} 의 사유가 너무 짧다`).toBeGreaterThan(40);
    }
  });

  it('최대 번호와 정의 수의 관계가 결번 수와 맞는다 — 값이 아니라 관계식을 잠근다', () => {
    const gaps = Array.from({ length: max }, (_, i) => i + 1).filter((n) => !set.has(n));
    expect(set.size + gaps.length, '정의 수 + 결번 수 = 최대 번호').toBe(max);
  });
});
