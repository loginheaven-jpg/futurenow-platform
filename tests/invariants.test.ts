// 불변식 참조 잠금 — **번호가 다시 매달리지 않게** (3차 T-6 후속 · 정본 2026-08-27).
//
// **이 파일이 막는 것.** `불변식 N` 이라는 번호가 1차 발주서 §11에서 붙은 뒤 발주서·메모·
//   코드 주석에서 계속 인용됐는데 **저장소에 목록이 없었다.** 참조 12개가 살아 있고 정의가 0이었다.
//   3차 T-6 이 그것을 발견했고 지휘부가 정본을 만들어 `CLAUDE.md` §12 로 실었다.
//
//   같은 일이 다시 일어나는 길은 둘이다 —
//     ⓐ 목록에 없는 번호를 인용한다(미아 참조)
//     ⓑ 항목을 지운다(옛 주석이 미아가 된다 — 정본이 "지우지 말고 폐기 표시" 라고 못 박았다)
//   여기서 둘 다 잡는다.
//
// **세는 단위를 먼저 정한다.** 지휘부는 12(리터럴 `불변식 N`), 클코1은 14(복합 참조
//   `불변식 6·7·9·10·11` 을 펼친 것)로 셌고 **둘 다 맞았다.** 갈린 것은 단위였다.
//   그래서 이 테스트는 **펼친 것**을 센다 — 복합 참조 안의 번호도 실제 인용이기 때문이다.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CANON = 'CLAUDE.md';
const canon = readFileSync(CANON, 'utf8');

/** `CLAUDE.md` §12 표에서 정의된 번호를 읽는다(`| 17 | **…** | … |`). */
function definedNumbers(): Set<number> {
  const i = canon.indexOf('## 12. 불변식 24');
  expect(i, '`CLAUDE.md` 에 §12 불변식 정본이 있어야 한다').toBeGreaterThan(-1);
  const out = new Set<number>();
  for (const m of canon.slice(i).matchAll(/^\|\s*(\d+)\s*\|/gm)) out.add(Number(m[1]));
  return out;
}

/** 저장소에서 `불변식 N`·`불변식 N·M·…` 을 모두 펼쳐 모은다. 정본 파일 자신은 뺀다. */
function referencedNumbers(): Map<number, string[]> {
  const roots = ['architecture.md', 'design_system.md', 'plan.md', 'docs', 'src', 'tests'];
  const skip = new Set(['불변식_정본_CLAUDE_md_삽입안.md']);
  const found = new Map<number, string[]>();

  const walk = (p: string): void => {
    let st;
    try { st = statSync(p); } catch { return; }
    if (st.isDirectory()) {
      for (const e of readdirSync(p)) if (e !== 'node_modules' && !e.startsWith('.')) walk(join(p, e));
      return;
    }
    if (!/\.(md|ts|tsx|css|sql)$/.test(p) || skip.has(p.split(/[\\/]/).pop() ?? '')) return;
    const text = readFileSync(p, 'utf8');
    for (const m of text.matchAll(/불변식\s+(\d+(?:·\d+)*)/g)) {
      for (const n of m[1].split('·').map(Number)) {
        found.set(n, [...(found.get(n) ?? []), p]);
      }
    }
  };
  roots.forEach(walk);
  return found;
}

describe('불변식 — 참조와 정의가 갈리지 않는다', () => {
  const defined = definedNumbers();
  const referenced = referencedNumbers();

  it('정본이 1~24 를 빠짐없이 정의한다', () => {
    expect([...defined].sort((a, b) => a - b)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
  });

  it('**인용된 번호가 전부 정본에 있다** — 미아 참조 0', () => {
    const orphans = [...referenced.keys()].filter((n) => !defined.has(n)).sort((a, b) => a - b);
    const detail = orphans.map((n) => `불변식 ${n} ← ${referenced.get(n)?.[0]}`).join(' / ');
    expect(orphans, `정본에 없는 번호를 인용했다: ${detail}`).toEqual([]);
  });

  it('참조가 실제로 살아 있다 — 목록만 있고 아무도 안 쓰는 상태가 아니다', () => {
    // 정본이 생긴 뒤 참조가 끊기면 그것도 드리프트다. 최소한 T-6 이 센 만큼은 남아 있어야 한다.
    expect(referenced.size, '펼친 참조가 14 미만이면 인용이 사라진 것이다').toBeGreaterThanOrEqual(14);
  });

  it('§12 가 자기 사용법과 개정 이력을 갖는다 — 번호만 있는 목록이 되지 않게', () => {
    expect(canon).toContain('### 12.1 이 목록을 쓰는 법');
    expect(canon).toContain('### 12.3 개정 이력');
    // 폐기 규율이 본문에 있어야 한다 — 지우면 옛 주석이 미아가 된다.
    expect(canon).toMatch(/지우지 말고 .*폐기.* 표시/);
  });

  it('§0 문서 우선순위가 §12 를 가리킨다 — 정본이 있어도 안 읽히면 없는 것과 같다', () => {
    const i0 = canon.indexOf('## 0. 문서 우선순위');
    const i1 = canon.indexOf('## 1.');
    expect(canon.slice(i0, i1)).toContain('§12');
  });
});
