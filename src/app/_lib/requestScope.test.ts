// 한 렌더에 한 번만 묻는가 (ADR-178).
//
// ★ **「있는가」로 묻지 않는다**(⑬) — `cache()` 가 실제로 **호출을 줄이는지** 값으로 잰다.
//   그리고 감사가 짚은 **위험 둘**이 되살아나면 붉어지게 둔다.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { cache } from 'react';

const calls = { ctx: 0, user: 0, consents: 0, cohorts: 0 };
vi.mock('@/core/supabase/server', () => ({
  createServerContext: async () => {
    calls.ctx += 1;
    return {
      currentUser: async () => { calls.user += 1; return { id: 'u1', role: 'user' }; },
      listMyConsents: async () => { calls.consents += 1; return []; },
      listMyCohorts: async () => { calls.cohorts += 1; return []; },
    };
  },
}));

describe('★★ memo 는 여기서 증명할 수 없다 — 그 사실을 박아 둔다', () => {
  beforeEach(() => { calls.ctx = 0; calls.user = 0; calls.consents = 0; calls.cohorts = 0; });

  it('★ 이 환경의 `cache` 는 **순수 통과**다 — 그래서 「한 번만 부른다」를 여기서 재지 않는다', () => {
    // 정본 확인(2026-09-02): 비-react-server 빌드의 `cache` 는
    //   `function (fn) { return function () { return fn.apply(null, arguments); }; }` 다.
    //   경고도 에러도 없다. vitest 는 그 빌드를 푼다.
    //   **그러므로 여기서 호출 수를 재면 거짓 초록이 아니라 「거짓 빨강」이 난다.**
    //   실제 효과는 **배포 뒤 서버 응답 시간**으로 잰다(⑨-c 창의 층이 대상의 층과 다르다).
    let n = 0;
    const f = cache(() => { n += 1; return n; });
    f(); f();
    expect(n, '이 환경이 memo 를 하기 시작했다 — 그러면 행동 잠금을 여기로 되살려라').toBe(2);
  });

  it('★★ **아래로 내려가는 문이 하나**다 — 우회하면 memo 가 붙어도 안 묶인다', () => {
    // ★ 처음엔 호출 수로 재려 했는데 **안 물었다** — 우회하든 안 하든 같은 팩토리를 지나
    //   수가 똑같았다. 이 환경에는 행동 창이 없으므로(위 항) **구조로** 잰다:
    //   `createServerContext` 를 부르는 자리가 **`requestContext` 하나뿐인가.**
    const src = readFileSync('src/app/_lib/requestScope.ts', 'utf8');
    // 주석도 그 이름을 말한다(왜 core 가 아닌지 적어 두었다) — **코드만** 센다.
    const body = src.split(String.fromCharCode(10))
      .filter((l) => { const t = l.trim(); return !t.startsWith('import ') && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*'); })
      .join(' ');
    const uses = body.split('createServerContext(').length - 1;
    expect(uses, '팩토리를 부르는 자리가 하나가 아니다 — 우회 경로가 생겼다').toBe(1);
    // 그리고 나머지 셋은 전부 그 문을 지난다.
    // ★ **손으로 열거한 목록이다** — 새 로더를 더하면 여기도 더해야 한다(U-6 이 `requestCohort` 를 더했다).
    //   전수로 바꾸려면 export 를 훑어야 하는데 그러면 `requestContext` 자신이 걸린다.
    for (const fn of ['requestUser', 'requestConsents', 'requestCohorts', 'requestCohort']) {
      const at = src.indexOf(`export const ${fn} =`);
      expect(at, `${fn} 이 없다`).toBeGreaterThan(-1);
      const seg = src.slice(at, src.indexOf(';', at));
      expect(seg, `${fn} 이 공용 문을 안 지난다`).toContain('requestContext()');
    }
  });

  it('로더 셋이 실제로 아래를 부른다 — 창이 비지 않았는가(계열 ⑦)', async () => {
    const m = await import('./requestScope');
    await m.requestUser();
    await m.requestConsents();
    await m.requestCohorts();
    expect(calls.user).toBe(1);
    expect(calls.consents).toBe(1);
    expect(calls.cohorts).toBe(1);
  });

});

describe('★ 감사가 짚은 위험 둘이 되살아나지 않는다', () => {
  const src = readFileSync('src/app/_lib/requestScope.ts', 'utf8');

  it('★★ 위험 ⑴ — **인자를 받지 않는다.** 받으면 `validators` 가 조용히 사라진다', () => {
    // `createServerContext(options)` 의 인자를 떨어뜨린 래퍼를 쓰면 join 액션의 zod 경계가
    //   **예외도 로그도 없이** 빈다(`validateWith` 는 스키마 없으면 원값 통과).
    expect(src, '컨텍스트 로더가 인자를 받는다').toContain('cache(async () => createServerContext())');
    // 그리고 validators 를 넘기는 자리는 **이 로더를 쓰지 않아야** 한다.
    const join = readFileSync('src/app/(public)/join/actions.ts', 'utf8');
    expect(join, 'validators 자리가 공용 로더를 쓴다 — 인자가 사라진다').not.toContain('requestContext');
    expect(join, 'validators 를 안 넘긴다').toContain('validators');
  });

  it('★★ 위험 ⑵ — core 를 한 글자도 안 고쳤다(서버·클라이언트 공용이다)', () => {
    // 클라이언트 빌드의 `cache` 는 조용히 통과한다 — core 에 넣으면 브라우저가 메모를 잃는다.
    const core = readFileSync('src/core/context.ts', 'utf8');
    expect(core, "core 에 react cache 가 들어왔다").not.toContain("from 'react'");
    expect(core, 'core 의 인스턴스 메모가 사라졌다').toContain('currentUserPromise');
  });

  it('★ 부수효과를 로더 안에 두지 않는다 — 에러 재렌더는 같은 요청에서 두 번 돈다', () => {
    for (const bad of ['revalidatePath', 'revalidateTag', 'saveResponse', 'recordConsent', 'enrollByCode']) {
      expect(src, `로더 안에서 쓰기를 한다: ${bad}`).not.toContain(bad);
    }
  });

  it("★ `'use client'` 파일이 이 로더를 수입하지 않는다", () => {
    // 클라이언트에서는 `cache` 가 조용히 통과한다 — **안 도는 것보다 도는 척하는 것이 나쁘다.**
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name)) {
          const s = readFileSync(p, 'utf8');
          if (s.includes('_lib/requestScope') && s.slice(0, 40).includes('use client')) hits.push(p);
        }
      }
    };
    walk('src');
    expect(hits, `클라이언트 파일이 수입한다: ${hits.join(', ')}`).toEqual([]);
  });
});
