// ADR 채번 잠금 — **번호가 미아가 되지도, 소급 부여되지도 않게** (2026-08-28 · 결번 처리 반영).
//
// **왜 이 파일이 생겼나.** CLAUDE.md §11-3 이 *"새 결정은 ADR 로 번호를 이어 붙인다(중복·결번 확인)"*
//   를 요구하는데 그 확인을 **매번 손으로** 했다. 손 확인은 세는 단위가 흔들리고, 실제로 흔들렸다 —
//   같은 표를 두고 `127`/`128`, 결번 `[12]`/`[12,115,116,117]` 이 나왔다. 갈린 것은
//   **`| ADR-115~117 |` 범위 행을 세느냐**였다. 값이 아니라 단위가 문제였다.
//
// **그리고 손 확인이 여섯 달 놓친 것이 있었다.** 보고서 둘이 결번 `ADR-12` 를 *"기존 상태"* 로
//   넘겼는데, `design_system.md` §0-2 가 그 번호를 **살아 있는 근거로 인용**하고 있었다.
//   전 리비전 131 개를 뒤진 결과 **ADR-12 원문은 존재한 적이 없다.**
//   지휘부 판정 — **소급 부여 금지.** 없으면 결번으로 잠그고, 문장에 결정 가치가 있으면
//   **새 번호로 채번해 출처를 적는다.** 그래서 12 는 결번 행이 되고 문장은 ADR-133 이 됐다.
//
// **번호의 상태는 셋이다** — 이 파일이 그 셋을 구분한다.
//   ⓐ **살아 있는 번호** — 표에 행이 있고 인용해도 된다
//   ⓑ **결번**(`*(결번 …)*`) — 행은 있으나 **뜻이 없다.** 재사용도 소급 부여도 금지이고,
//      **살아 있는 사양 문서가 근거로 인용하면 안 된다**
//   ⓒ **없는 번호** — 행 자체가 없다. 인용하면 미아다
//
// **이 파일이 막는 것** — 중복 채번 · 행 없는 결번 · 미아 참조 ·
//   **결번을 근거로 인용하기**(소급 부여의 실질적 형태) · 관계식 붕괴.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CANON = 'architecture.md';
const canon = readFileSync(CANON, 'utf8');

/**
 * 결번을 **말해도 되는 곳**. 결번이라는 사실 자체를 다루는 문서들이다.
 *  - 정본: 결번 행이 여기 있다
 *  - 보고서: 발견·판정의 기록이라 번호가 나온다(과거를 고쳐 쓰지 않는다)
 *  - 이 파일: 잠금 자신
 * 그 밖의 **살아 있는 사양·코드**가 결번을 인용하면 실패한다.
 */
const VOID_MENTION_OK = [/^architecture\.md$/, /^docs\/reports\//, /^tests\/adrNumbers\.test\.ts$/];

/**
 * **한 번 결번이면 영원히 결번이다.** 이 집합이 그 잠금이다 — ⑵ 얼어야 하는 값이라 박되
 * 잠금(이 파일)을 함께 둔다. 표의 결번 표시만으로는 부족하다: 누군가 결번 행을 **뜻 있는 행으로
 * 바꿔 버리면** 표는 멀쩡한 살아 있는 번호로 보이고 아무도 모른다. 그것이 곧 **소급 부여**이고,
 * 지휘부가 금지한 바로 그 동작이다(2026-08-28 판정). 여기 적힌 번호는 표에서도 결번이어야 한다.
 *
 * **번호를 지우지 않는다.** 결번이 풀리는 길은 원문이 발견되는 경우뿐인데, 그때는 복원이지
 * 새 뜻을 붙이는 것이 아니므로 지휘부 판정을 다시 거친다.
 */
const VOID_FOREVER = new Map<number, string>([
  [12, '원문이 존재한 적이 없다 — architecture.md 전 리비전 131 개 전수 조회(2026-08-28). 문장의 결정 가치는 ADR-133 으로 새로 채번했다'],
]);

interface Row { no: number; void: boolean }

/** `| ADR-73 | …`·`| ADR-115~117 | …`·`| ADR-12 | *(결번 …)* | …` 을 모두 읽는다. */
function rows(): Row[] {
  const out: Row[] = [];
  for (const m of canon.matchAll(/^\|\s*ADR-(\d+)(?:\s*~\s*(\d+))?\s*\|([^|]*)\|/gm)) {
    const a = Number(m[1]);
    const b = Number(m[2] ?? m[1]);
    const isVoid = /결번/.test(m[3]);
    for (let n = a; n <= b; n += 1) out.push({ no: n, void: isVoid });
  }
  return out;
}

/** 저장소에서 `ADR-73`·`ADR-04·75·78`·`ADR-13~16` 을 모두 펼쳐 모은다. */
function referencedNumbers(): Map<number, string[]> {
  const roots = ['architecture.md', 'design_system.md', 'plan.md', 'CLAUDE.md', 'docs', 'src', 'tests', 'supabase'];
  const found = new Map<number, string[]>();

  const walk = (p: string): void => {
    let st;
    try { st = statSync(p); } catch { return; }
    if (st.isDirectory()) {
      for (const e of readdirSync(p)) if (e !== 'node_modules' && !e.startsWith('.')) walk(join(p, e));
      return;
    }
    if (!/\.(md|ts|tsx|css|sql)$/.test(p)) return;
    const rel = p.replace(/\\/g, '/');
    for (const m of readFileSync(p, 'utf8').matchAll(/ADR-(\d+(?:[·~]\d+)*)/g)) {
      const g = m[1];
      const ns = g.includes('~')
        ? (() => { const [a, b] = g.split('~').map(Number); return Array.from({ length: b - a + 1 }, (_, i) => a + i); })()
        : g.split('·').map(Number);
      for (const n of ns) found.set(n, [...(found.get(n) ?? []), rel]);
    }
  };
  roots.forEach(walk);
  return found;
}

describe('ADR 채번 — 중복도 미아도 소급 부여도 없다', () => {
  const all = rows();
  const numbers = all.map((r) => r.no);
  const defined = new Set(numbers);
  const voids = new Set(all.filter((r) => r.void).map((r) => r.no));
  const referenced = referencedNumbers();
  const max = Math.max(...numbers);

  it('중복 채번이 없다 — 한 번호가 두 결정을 가리키면 인용이 어느 쪽인지 말할 수 없다', () => {
    const dup = [...new Set(numbers.filter((n, i) => numbers.indexOf(n) !== i))].sort((a, b) => a - b);
    expect(dup, `중복 ADR 번호: ${dup.join(' · ')}`).toEqual([]);
  });

  it('**빈 번호가 없다** — 결번도 행으로 적는다. 비워 두면 다음 사람이 다시 쓴다', () => {
    const holes = Array.from({ length: max }, (_, i) => i + 1).filter((n) => !defined.has(n));
    expect(holes, `행이 없는 번호: ${holes.join(' · ')} — 결번이면 결번 행을 적어라`).toEqual([]);
  });

  it('인용된 번호가 전부 표에 있다 — 미아 참조 0', () => {
    const orphans = [...referenced.keys()].filter((n) => !defined.has(n)).sort((a, b) => a - b);
    expect(orphans, `정의 없는 ADR 인용: ${orphans.join(' · ')}`).toEqual([]);
  });

  it('**결번을 살아 있는 근거로 인용하지 않는다** — 소급 부여 금지의 실질 형태', () => {
    const bad: string[] = [];
    for (const n of voids) {
      for (const f of new Set(referenced.get(n) ?? [])) {
        if (!VOID_MENTION_OK.some((re) => re.test(f))) bad.push(`ADR-${n} ← ${f}`);
      }
    }
    expect(bad, `결번을 근거로 인용한 곳: ${bad.join(' · ')}`).toEqual([]);
  });

  it('**한 번 결번이면 영원히 결번이다** — 결번 행을 뜻 있는 행으로 바꾸는 것이 소급 부여다', () => {
    const revived = [...VOID_FOREVER.keys()].filter((n) => !voids.has(n));
    expect(revived, `소급 부여로 되살아난 결번: ADR-${revived.join(' · ADR-')}`).toEqual([]);
    for (const [n, why] of VOID_FOREVER) {
      expect(why.length, `ADR-${n} 이 왜 결번인지 여기에도 적어라`).toBeGreaterThan(30);
    }
  });

  it('결번 행에는 사유가 적혀 있다 — 번호만 비워 둔 것과 구별되게', () => {
    for (const n of voids) {
      const row = canon.split('\n').find((l) => l.startsWith(`| ADR-${n} |`)) ?? '';
      expect(row.length, `ADR-${n} 결번 행이 너무 짧다 — 왜 결번인지 적어라`).toBeGreaterThan(200);
    }
  });

  it('관계식이 성립한다 — 값이 아니라 값들 사이의 불변량을 잠근다', () => {
    // 살아 있는 번호 + 결번 = 정의된 번호 = 최대 번호. 한 축만 틀려도 여기서 소리가 난다.
    // 세 값을 **따로 세어** 맞춘다 — 한 값에서 파생시키면 항등식이 되어 아무것도 못 잡는다.
    const live = new Set(all.filter((r) => !r.void).map((r) => r.no));
    expect(live.size + voids.size, `살아 있는 ${live.size} + 결번 ${voids.size} = 정의 ${defined.size}`).toBe(defined.size);
    expect(defined.size, '정의 수 = 최대 번호(빈 번호가 없으므로)').toBe(max);
  });
});
