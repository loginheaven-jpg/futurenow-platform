// 도구 접근 게이트 잠금 — **가이드가 글이 아니라 코드가 되도록** (5차 · 최박사 모델).
//
// 최박사 지시: *"진입하는 사람이 어떤 자격자인지만 패러미터가 넘어가면 된다."*
// 지휘부 정리: *"가이드는 「이렇게 판단하라」가 아니라 「이 함수를 불러라」라고 말해야 한다."*
//   글로 규칙을 주면 도구마다 다시 구현해 **사본이 도구 수만큼** 생긴다.
//
// **이 파일이 막는 것** — 새 도구가 게이트를 **아예 안 적는 것.**
//   어제 계열 ⑦(마이그레이션이 없는 함수를 고치고 있었다)과 같은 층이고,
//   그때 잡은 것이 테스트가 아니라 **실물 조회**였다는 사실이 이 파일의 설계를 정했다.
//
// ─────────────────────────────────────────────────────────────────────────────
// **이 테스트가 못 막는 것 — 정직하게 적는다.**
//
//   ⑴ **호출은 하는데 결과를 무시하는 경우.** `PERFORM public.member_tool_access(...)` 만 적고
//      `IF ... THEN RAISE` 를 안 쓰면 **문자열은 있고 강제는 없다.** 여기서는 통과한다.
//      → 이것이 가장 현실적인 구멍이다(게이트를 적으려다 만 형태).
//   ⑵ **잘못된 인자.** `auth.uid()` 대신 받은 uid 를 넘기면 남의 자격으로 통과한다.
//   ⑶ **어느 동작이 신규인지 이름만으로는 갈리지 않는다.** `value_patch` 처럼 **일부러**
//      안 거는 것과 실수로 빠뜨린 것을 구별하려면 아래 `NO_GATE` 예외 목록을 손으로 유지해야 하고,
//      그 목록이 낡으면 잠금이 헐거워진다(`designParts` 의 `NOT_PARTS` 와 같은 종류).
//   ⑷ **RPC 밖 경로.** `authenticated` 에 테이블 write GRANT 가 되살아나면 RPC 를 우회한다.
//      지금은 회수돼 있으나(ADR-122 ⑦) 그 회수가 풀리는 것을 이 테스트는 보지 않는다.
//
//   **그러므로 이 잠금은 「게이트가 있는가」를 재지 「게이트가 작동하는가」를 재지 않는다.**
//   후자는 실DB 통합 테스트가 할 일이다(`RUN_RLS_INTEGRATION` 계열).
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIG_DIR = 'supabase/migrations';

/** 게이트 창구. 도구는 **이 함수 하나만** 부르면 된다. */
const GATE = 'member_tool_access';

/**
 * **도구 RPC 목록 — 한 곳에 선언한다.**
 *
 * 새 도구가 붙으면 여기 이름을 더한다. 더하지 않으면 아래 역방향 검사가 잡는다.
 * `<도구>_<동작>` 규약은 새로 만든 것이 아니라 **실물이 이미 그 꼴**이다
 * (실측 2026-08-30: `value_*` 4 · `feed_*` 14 · `checkin_*` 4 · `news_*` 6 …).
 */
const TOOL_RPCS: readonly string[] = [
  'value_save_progress',
  'value_finalize',
];

/**
 * **일부러 게이트를 걸지 않는 도구 함수** — 사유를 값 옆에 적는다.
 * 목록만 있고 사유가 없으면 다음 사람이 판단할 수 없다.
 */
const NO_GATE = new Map<string, string>([
  ['value_patch', '확정 후 라벨 수정이라 신규 응시가 아니다(ADR-122 ⑮ — 확정 후 라벨과 열람 전부는 막지 않는다)'],
]);

/** 도구 접두사 — 역방향 검사가 이것으로 훑는다. */
const TOOL_PREFIXES = ['value'] as const;
/** 신규(쓰기)를 뜻하는 동작 이름. 열람 계열은 게이트를 걸지 않는다. */
const WRITE_VERBS = ['save', 'finalize', 'create', 'start', 'submit'] as const;

/** 마이그레이션 전체를 한 덩이로 읽는다 — 함수는 여러 파일에 걸쳐 재정의된다. */
function allSql(): string {
  return readdirSync(MIG_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(MIG_DIR, f), 'utf8'))
    .join('\n');
}

/** 함수의 **마지막** 정의를 뽑는다 — 뒤 마이그레이션이 앞을 덮는다. */
function lastDefinition(sql: string, name: string): string | null {
  const re = new RegExp(`CREATE (?:OR REPLACE )?FUNCTION public\\.${name}\\s*\\(([\\s\\S]*?)\\$\\$;`, 'g');
  let last: string | null = null;
  for (const m of sql.matchAll(re)) last = m[0];
  return last;
}

const SQL = allSql();

describe('도구 접근 게이트 — 목록과 실물이 갈리지 않는다', () => {
  it('**창구 함수가 저장소에 있다** — 이름을 추측하지 않는다', () => {
    expect(lastDefinition(SQL, GATE), `${GATE} 정의가 없다`).not.toBeNull();
  });

  it('선언된 도구 RPC 가 **전부 저장소에 실재한다** — 목록이 유령을 가리키지 않는다', () => {
    const missing = TOOL_RPCS.filter((n) => lastDefinition(SQL, n) === null);
    expect(missing, `선언됐으나 정의가 없는 RPC: ${missing.join(' · ')}`).toEqual([]);
  });

  it('**각 도구 RPC 가 게이트를 부른다**', () => {
    const naked: string[] = [];
    for (const name of TOOL_RPCS) {
      const def = lastDefinition(SQL, name);
      if (def && !def.includes(GATE) && !def.includes('member_can_assess')) naked.push(name);
    }
    // `member_can_assess` 도 통과시킨다 — 그것이 `member_tool_access` 의 얇은 래퍼이기 때문이다.
    expect(naked, `게이트 없는 도구 RPC: ${naked.join(' · ')}`).toEqual([]);
  });

  it('**역방향 — 목록에 없는 도구 쓰기 RPC 가 저장소에 있으면 잡는다**(등록 누락)', () => {
    const declared = new Set<string>([...TOOL_RPCS, ...NO_GATE.keys()]);
    const found = new Set<string>();
    for (const m of SQL.matchAll(/CREATE (?:OR REPLACE )?FUNCTION public\.([a-z0-9_]+)\s*\(/g)) {
      const n = m[1];
      if (!TOOL_PREFIXES.some((p) => n.startsWith(`${p}_`))) continue;
      if (!WRITE_VERBS.some((v) => n.includes(`_${v}`))) continue;
      found.add(n);
    }
    const unregistered = [...found].filter((n) => !declared.has(n)).sort();
    expect(unregistered, `목록에 없는 도구 쓰기 RPC: ${unregistered.join(' · ')} — TOOL_RPCS 나 NO_GATE 에 등록하라`)
      .toEqual([]);
  });

  it('게이트를 안 거는 함수에는 **사유가 붙어 있다** — 목록만 있는 예외는 판단할 수 없다', () => {
    for (const [name, why] of NO_GATE) {
      expect(why.length, `${name} 의 사유가 너무 짧다`).toBeGreaterThan(20);
      expect(lastDefinition(SQL, name), `${name} 이 저장소에 없는데 예외 목록에 남아 있다`).not.toBeNull();
    }
  });

  it('**창구가 셋을 돌려준다** — full · read_only · none', () => {
    const def = lastDefinition(SQL, GATE) ?? '';
    for (const v of ['full', 'read_only', 'none']) {
      expect(def, `${GATE} 가 ${v} 를 돌려주지 않는다`).toContain(`'${v}'`);
    }
  });

  it('**`member_can_assess` 는 지워지지 않고 래퍼로 산다** — 기존 호출부가 한 줄도 안 바뀐다', () => {
    const def = lastDefinition(SQL, 'member_can_assess');
    expect(def, 'member_can_assess 정의가 사라졌다').not.toBeNull();
    expect(def, '래퍼가 창구를 부르지 않는다').toContain(GATE);
  });

  it('**못 막는 것을 파일이 스스로 적어 둔다** — 잠금을 과신하지 않게', () => {
    const self = readFileSync('tests/toolGate.test.ts', 'utf8');
    expect(self).toContain('호출은 하는데 결과를 무시하는 경우');
    expect(self).toContain('게이트가 있는가');
  });
});

// ── 회원 모델 마이그레이션이 **스스로 들고 있어야 할 것** (2026-08-30 지휘부 지적) ──────
//
// 보고서에만 적으면 다음 사람이 파일만 보고 적용한다. 그래서 파일이 들고 있고,
// 그것이 실제로 들려 있는지를 여기서 잰다 — 주석은 지워질 수 있다.
describe('membership_model 마이그레이션 — 적용 전 점검', () => {
  const FILE = 'supabase/migrations/20260830090000_membership_model.sql';
  const sql = readFileSync(FILE, 'utf8');

  it('**`is_admin` 자리가 미확정임을 적어 두었다** — 다음 사람이 의도로 오해하지 않게', () => {
    expect(sql).toContain('이 자리는 미확정이다');
    expect(sql).toContain('의도가 아니라 보류다');
  });

  it('**RLS 정책의 함수 호출 위험과 그 근거를 적어 두었다**', () => {
    expect(sql).toContain('행 단위 평가');
    expect(sql).toContain('InitPlan');
  });

  it('**적용 뒤 검증 항목을 파일이 들고 있다** — 다섯', () => {
    expect(sql).toContain('적용 뒤 검증 항목');
    for (const item of ['EXPLAIN', '진실표 재검증', 'RUN_RLS_INTEGRATION', '양방향 실재', '오염 0']) {
      expect(sql, `검증 항목에 ${item} 가 없다`).toContain(item);
    }
  });

  it('**적용 금지가 파일 머리에 적혀 있다** — 승인 전이다', () => {
    expect(sql.slice(0, 600)).toContain('아직 적용되지 않았다');
  });

  it('**존재하지 않는 함수를 부르지 않는다** — 미완으로 두었던 자리의 회귀 잠금', () => {
    // 초판은 `my_cohorts_rows()` 라는 없는 함수를 불렀다. 정본을 읽어 옮겨 고쳤다.
    expect(sql).not.toContain('my_cohorts_rows');
  });
});
