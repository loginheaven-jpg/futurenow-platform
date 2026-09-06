import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// 공용 부품 표 잠금 — **문서가 코드보다 좁지 않게** (U-11).
//
// ─────────────────────────────────────────────────────────────────────────────
// **왜 생겼나.** U-10 에서 「관리」를 `core/ui/Disclosure` 로 갈아탈 때, 그 부품이 **코드에는 있는데
//   `design_system.md` §9 표에는 없다**는 것이 드러났다. 재 보니 드리프트가 **양방향**이었다:
//     · 코드에 있는데 표에 없다 — `MultiChoiceChips` · `Disclosure`
//     · **표에 있는데 코드에 없다** — `StatTriple`(`grep -rn StatTriple src` → 0건)
//   **잠금이 없어 양쪽 다 조용했다.** `tests/designParts.test.ts` 가 있지만 그것이 보는 것은
//   `src/app/_screens/site` 의 §9.7 표다 — **core/ui 는 아무도 안 봤다**(창이 대상을 안 덮었다 · ⑨-a).
//
// **세는 단위를 먼저 정한다**(`designParts` 의 교훈): **부품 = `core/ui/index.ts` 가 `export` 하는 이름.**
//   파일 목록이 아니라 **공개 표면**을 센다 — 표가 약속하는 것이 그것이기 때문이다
//   (`ui.css`·`README.md`·`*.test.tsx` 는 export 가 아니라 자동으로 빠진다).
// ─────────────────────────────────────────────────────────────────────────────
const DOC = 'design_system.md';
const INDEX = 'src/core/ui/index.ts';

/** `export { X } from './X';` 에서 이름만. **순수 함수라 물려 볼 수 있다.** */
export function exportedNames(src: string): string[] {
  return [...src.matchAll(/export\s*\{\s*([A-Za-z0-9_]+)\s*\}/g)].map((m) => m[1]);
}

/** §9 표(「## 9. 공용 컴포넌트」 ~ 다음 `##`)의 첫 칸에 적힌 이름들. `·` 로 묶인 행은 쪼갠다. */
export function tableNames(doc: string): string[] {
  const at = doc.indexOf('## 9. 공용 컴포넌트');
  if (at < 0) return [];
  const end = doc.indexOf('\n### ', at);
  const block = doc.slice(at, end < 0 ? undefined : end);
  return block
    .split(String.fromCharCode(10))
    .filter((l) => l.startsWith('| ') && !l.startsWith('| 컴포넌트') && !l.startsWith('|---'))
    .flatMap((l) => l.split('|')[1].split('·'))
    .map((s) => s.trim())
    .filter((s) => /^[A-Za-z][A-Za-z0-9]*$/.test(s));
}

describe('공용 부품 — 표와 코드가 같다', () => {
  const code = exportedNames(readFileSync(INDEX, 'utf8'));
  const doc = tableNames(readFileSync(DOC, 'utf8'));

  it('**자가 문다** — 표에서 이름을 뽑는 규칙이 실제로 작동한다', () => {
    expect(exportedNames("export { Foo } from './Foo';")).toEqual(['Foo']);
    expect(exportedNames('// export { Foo }')).toEqual(['Foo']); // 주석까지 세는 것은 과잉이 아니다 — index.ts 에 주석 export 는 없다
    expect(tableNames('## 9. 공용 컴포넌트\n\n| 컴포넌트 | 비고 |\n|---|---|\n| A · B | x |\n')).toEqual(['A', 'B']);
    // 첫 칸이 이름이 아닌 행(설명 문장)은 세지 않는다.
    expect(tableNames('## 9. 공용 컴포넌트\n\n| 컴포넌트 | 비고 |\n|---|---|\n| 응답 위젯 | x |\n')).toEqual([]);
  });

  it('**잴 것이 실재한다**(⑦) — 양쪽이 비어 있지 않다', () => {
    expect(code.length, 'core/ui 가 아무것도 내보내지 않는다 — 도구가 고장 났다').toBeGreaterThan(8);
    expect(doc.length, '§9 표를 못 읽었다').toBeGreaterThan(8);
  });

  it('★★ **표가 코드보다 좁지 않다** — 내보내는데 표에 없는 부품이 없다', () => {
    const missing = code.filter((n) => !doc.includes(n));
    expect(missing, '코드에 있는데 §9 표에 없다 — 다음 사람이 표만 보고 없는 줄 안다').toEqual([]);
  });

  it('★★ **표가 코드보다 넓지도 않다** — 표에 있는데 없는 부품이 없다', () => {
    const stale = doc.filter((n) => !code.includes(n));
    expect(stale, '§9 표에 있는데 core/ui 가 안 내보낸다 — 없는 것을 있다고 적은 것이다').toEqual([]);
  });
});
