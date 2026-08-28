// `design_system.md` §9.7 부품 목록 잠금 — **문서가 코드보다 늦지 않게** (2026-08-28).
//
// **왜 이 파일이 생겼나.** CLAUDE.md §11 이 *"적히는 모든 값은 둘 중 하나다"* 를 규율로 올린 뒤
//   그 잣대로 문서를 훑었더니 §9.7 의 **`부품 15`** 가 걸렸다. 이것은 ⑴ 따라가야 하는 값인데
//   (부품을 더하면 늘어난다) ⑵ 얼어야 하는 값처럼 **맨숫자로 박혀 있었고 잠금이 없었다.**
//   오늘은 맞다 — 실제로 열다섯이다. **틀릴 때를 아무도 모른다는 것이 문제다.**
//
//   드리프트가 나는 길은 셋이다 —
//     ⓐ 부품을 더하고 §9.7 에 행을 안 붙인다(표가 코드보다 짧아진다)
//     ⓑ 행은 붙이고 머리의 숫자를 안 고친다(`부품 15` 인데 열여섯 행)
//     ⓒ 파일을 지우거나 이름을 바꾸는데 `현재` 칸이 옛 이름을 가리킨다
//   여기서 셋 다 잡는다. **문서 정합은 완료 판정 게이트다**(불변식 24) — 게이트는 사람이 아니라
//   테스트가 지켜야 매번 지켜진다.
//
// **세는 단위를 먼저 정한다**(`invariants.test.ts` 의 교훈 — 갈린 것은 값이 아니라 단위였다).
//   여기서 **부품**은 `src/app/_screens/site/` 의 `.tsx` 중 아래 `NOT_PARTS` 를 뺀 것이다.
//   뺀 것들은 **부품을 늘어놓는 진열대**(`/preview/site`)이거나 **부품을 쓰는 화면 층**이다.
//   (**넷으로 늘었다** — 5차에 `PublicGnb.tsx`, U-1 에 `PublicShell.tsx` 가 더해졌다.
//    이 줄을 값과 함께 고친다: *그 둘* 이라고 적어 두면 늘어난 날 문장이 조용히 거짓이 된다.
//    `.test.tsx` 는 `actualParts()` 가 이미 거르므로 목록에 적지 않는다.)
//   목록에 없는 `.tsx` 가 새로 생기면 이 테스트가 **시끄럽게 실패한다** — 부품인지 진열대인지
//   사람이 한 번 정하라는 뜻이고, 조용히 넘어가는 것보다 낫다.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DOC = 'design_system.md';
const PARTS_DIR = 'src/app/_screens/site';

/** 부품이 아닌 `.tsx`. 뺀 이유를 **값 옆에** 적는다 — 목록만 있는 예외는 다음 사람이 판단할 수 없다. */
const NOT_PARTS = new Map<string, string>([
  ['SiteGallery.tsx', '/preview/site 진열 화면 — 부품을 늘어놓는 쪽이다'],
  ['galleryFixture.tsx', '진열대가 먹일 가짜 데이터 — 렌더 경로에 실려 나가지 않는다'],
  ['PublicGnb.tsx', '화면 층 오케스트레이터(5차 소건 1-바) — 세션을 읽어 SiteGnb 에 prop 으로 내려준다. 부품이 아니라 부품을 쓰는 쪽이다'],
  ['PublicShell.tsx', '공개 껍데기 자신(U-1) — 부품을 조립해 상단바·푸터를 세우는 쪽이다. 부품 표의 항목이 아니다'],
]);

const doc = readFileSync(DOC, 'utf8');

/** §9.7 머리에 적힌 수(`### 9.7 공개·홈 부품 15 (…)`)와 표 본문을 함께 읽는다. */
function section97(): { declared: number; body: string } {
  const m = doc.match(/^### 9\.7 공개·홈 부품 (\d+)/m);
  expect(m, '`design_system.md` 에 §9.7 부품 목록이 있어야 한다').not.toBeNull();
  const start = doc.indexOf(m![0]);
  const next = doc.indexOf('\n### ', start + 1);
  return { declared: Number(m![1]), body: doc.slice(start, next === -1 ? undefined : next) };
}

/** 표 행에서 번호와 `현재` 칸의 파일명을 뽑는다. 이름 칸은 안 본다 — `SiteRoleCard` 는 `RoleCard.tsx` 다. */
function rows(body: string): { no: number; file: string }[] {
  const out: { no: number; file: string }[] = [];
  for (const line of body.split('\n')) {
    const m = line.match(/^\|\s*(\d+)\s*\|.*\|\s*`([^`]+\.tsx)`\s*\|\s*$/);
    if (m) out.push({ no: Number(m[1]), file: m[2] });
  }
  return out;
}

function actualParts(): string[] {
  return readdirSync(PARTS_DIR)
    .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx') && !NOT_PARTS.has(f))
    .sort();
}

describe('design_system §9.7 — 표와 부품이 갈리지 않는다', () => {
  const { declared, body } = section97();
  const listed = rows(body);

  it('머리에 적힌 수와 표의 행 수가 같다 — 행만 붙이고 숫자를 안 고치는 길(ⓑ)을 막는다', () => {
    expect(listed.length, `§9.7 머리는 ${declared}, 표는 ${listed.length} 행`).toBe(declared);
  });

  it('번호가 1부터 빠짐없이 이어진다 — 번호를 재사용하면 옛 참조가 미아가 된다(§12.1)', () => {
    expect(listed.map((r) => r.no)).toEqual(Array.from({ length: listed.length }, (_, i) => i + 1));
  });

  it('`현재` 칸의 파일이 실제로 있다 — 옛 이름을 가리키는 길(ⓒ)을 막는다', () => {
    const onDisk = new Set(readdirSync(PARTS_DIR));
    const missing = listed.filter((r) => !onDisk.has(r.file));
    expect(missing.map((r) => `#${r.no} ${r.file}`), '§9.7 이 없는 파일을 가리킨다').toEqual([]);
  });

  it('**부품 파일과 표가 정확히 같다** — 만들고 문서를 안 고치는 길(ⓐ)을 막는다', () => {
    const inTable = [...new Set(listed.map((r) => r.file))].sort();
    // 양쪽 방향을 한 번에 본다 — 어느 쪽이 남는지 실패 메시지가 바로 말해 준다.
    expect(inTable, `표에만 있거나 파일에만 있는 것이 없어야 한다 (뺀 것: ${[...NOT_PARTS.keys()].join(' · ')})`)
      .toEqual(actualParts());
  });

  it('뺀 파일에는 뺀 이유가 붙어 있다 — 목록만 있는 예외는 다음 사람이 못 판단한다', () => {
    for (const [file, why] of NOT_PARTS) {
      expect(why.length, `${file} 의 제외 사유가 비었다`).toBeGreaterThan(10);
    }
    // 진열대가 사라졌는데 예외만 남는 것도 드리프트다.
    const onDisk = new Set(readdirSync(PARTS_DIR));
    for (const file of NOT_PARTS.keys()) {
      expect(onDisk.has(file), `${file} 이 없는데 제외 목록에 남아 있다`).toBe(true);
    }
  });
});
