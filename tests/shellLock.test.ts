import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { scanDrawers, routeHeaderMap, stripComments, headerImportsOf } from '../scripts/shellAudit.mjs';
import { PROTECTED_PREFIXES } from '@/proxy.guard';

// 껍데기 잠금 — **화면은 헤더를 그리지 않는다** (U-0 · `design_system.md` §11).
//
// **`page.tsx` 만 재지 않는다.** 그렇게 하면 한 단계 아래가 그리는 것을 통과시키고,
//   `/home` 이 그 증거였다 — 예외로 넣어도 아무것도 막지 않고 지워도 레드가 안 난다.
//   *목록이 비면 완성* 이라는 지표가 그 순간 거짓이 된다.
//   그래서 **`src/app` 아래 모든 `.tsx`** 를 재고 부품 자신과 면제분만 뺀다.
//
// **주석은 걷어내고 센다.** 이 회차에 주석 오측이 셋이었고 셋 다 다른 사람이 냈다.
//   세는 일은 `scripts/shellAudit.mjs` 한 곳이 한다 — 테스트가 그것을 **수입해서** 쓰므로
//   재는 방법이 둘로 갈리지 않는다(불변식 23).

const cfg = JSON.parse(readFileSync('scripts/shellExceptions.json', 'utf8')) as {
  exemptParts: string[];
  exemptDeclared: string[];
  /** 껍데기 «바깥» — 예외도 면제도 아니고, 껍데기가 애초에 두르지 않는 자리다. */
  exemptOutside: string[];
  exceptions: { file: string; chunk: string; why: string }[];
  /** **이월** — 예외와 같은 형식이다. 비면 완성이고, 적지 않으면 이월이 영구가 된다. */
  carryOver: { item: string; chunk: string; why: string }[];
};
// U-4 는 **이름과 문**을 다루는 덩이다(공통 규칙 3·4). `/join`·`/signup` 의 뒤로 제어가 거기 산다.
const CHUNKS = ['U-1', 'U-2', 'U-3', 'U-4'];

describe('껍데기 잠금 — 화면이 헤더를 직접 그리지 않는다', () => {
  const drawn = scanDrawers().map((r: { file: string }) => r.file);
  const exempt = new Set([...cfg.exemptParts, ...cfg.exemptDeclared, ...cfg.exemptOutside]);
  const listed = new Map(cfg.exceptions.map((e) => [e.file, e]));

  it('**새로 그리는 화면이 없다** — 목록에 없으면 레드', () => {
    const unlisted = drawn.filter((f) => !exempt.has(f) && !listed.has(f));
    expect(unlisted, '헤더를 그리는데 예외 목록에 없다 — 껍데기가 그리게 하라').toEqual([]);
  });

  it('**예외는 실물이어야 한다** — 더는 안 그리면 목록에서 지운다', () => {
    const stale = cfg.exceptions.map((e) => e.file).filter((f) => !drawn.includes(f));
    expect(stale, '이미 걷힌 항목이 목록에 남아 있다 — 지워야 진도 지표가 참이 된다').toEqual([]);
  });

  it('**모든 예외에 걷는 덩이가 박혀 있다** — 적지 않으면 예외가 영구가 된다', () => {
    for (const e of cfg.exceptions) {
      expect(CHUNKS, `${e.file} 의 덩이가 이상하다`).toContain(e.chunk);
      expect(e.why.length, `${e.file} 에 사유가 없다`).toBeGreaterThan(0);
    }
  });

  it('**부품 자신은 면제다** — 껍데기를 만드는 파일까지 막으면 만들 수가 없다', () => {
    for (const f of cfg.exemptParts) expect(drawn, `${f} 가 실제로는 헤더를 안 쓴다`).toContain(f);
  });
});

describe('`/preview` 면제 — 선언은 의도를 말하고 설정은 사실을 말한다', () => {
  // **문장만 재면 부족하다.** 이 회차에 배운 것이 정확히 그 한계다 —
  //   마이그레이션 적용 상태 잠금이 「그 문장이 있는가」를 쟀고 「사실인가」를 재지 않아
  //   적용 뒤에도 거짓을 지켰다. 그래서 여기서는 **셋**을 잰다.

  it('⑴ 선언 — `/preview` 가 스스로 운영 라우트가 아니라고 적는다', () => {
    const layout = readFileSync('src/app/preview/layout.tsx', 'utf8');
    expect(layout, '선언이 사라졌다 — 면제의 근거가 없어졌다').toContain('운영 라우트 아님');
  });

  it('⑵ 설정 — `/preview` 가 보호 접두사에 남아 있다', () => {
    // 운영 라우트가 되려면 이 설정이 먼저 바뀐다. **바뀌는 순간 면제가 레드가 된다.**
    expect(PROTECTED_PREFIXES, '/preview 가 보호에서 빠졌다 — 운영 라우트가 됐다면 면제를 걷어라')
      .toContain('/preview');
  });

  it('**껍데기 바깥은 사실로 잠근다** — layout 이 동의 미완에 껍데기를 두르지 않는가', () => {
    // 문자열이 아니라 **동작**을 잰다. 이 분기가 사라지면 동의 화면에 헤더가 둘이 된다.
    const layout = readFileSync('src/app/(member)/layout.tsx', 'utf8');
    expect(layout, '동의 판정이 없다').toContain('consented');
    expect(layout, '동의 미완에 맨 children 을 돌려주지 않는다').toMatch(/if \(!consented\) return <>\{children\}<\/>;/);
    // 그리고 그 파일 자신은 한 줄도 안 바뀐다 — §4 무접촉은 `tests/untouched.test.ts` 가 잰다.
    for (const f of cfg.exemptOutside) expect(readFileSync(f, 'utf8')).toContain('AppHeader');
  });

  it('⑶ **사실** — `/preview` 면제 파일에 닿는 라우트가 전부 `/preview` 다', () => {
    // 이것이 가장 센 잠금이다. 누가 그 부품을 운영 화면에서 쓰기 시작하면
    //   선언도 설정도 그대로인데 **사실이 먼저 바뀌고** 여기서 레드가 난다.
    const map = routeHeaderMap() as { route: string; hits: string[] }[];
    for (const f of cfg.exemptDeclared) {
      const routes = map.filter((r) => r.hits.some((h) => h.startsWith(`${f}:`))).map((r) => r.route);
      expect(routes.length, `${f} 에 닿는 라우트가 없다 — 면제가 죽은 항목이다`).toBeGreaterThan(0);
      const operational = routes.filter((r) => !r.startsWith('/preview'));
      expect(operational, `${f} 를 운영 라우트가 쓴다 — 더는 면제가 아니다`).toEqual([]);
    }
  });
});

describe('실측 도구 자신을 먼저 잰다 — 주석을 정말 걷어내는가', () => {
  // **도구가 재는 것이 내가 재려던 것인지 한 번 확인하고 쓴다**(`CLAUDE.md` §11).
  //   이 도구가 생긴 이유가 주석 오측 셋이므로, 그 능력 자체를 잠근다.
  it('줄 주석·블록 주석 안의 import 는 세지 않는다', () => {
    const src = [
      "// import { AppHeader } from '@/app/_screens/AppHeader';",
      '/* import { SiteGnb } from "@/app/_screens/site/SiteGnb"; */',
      " *   `AppHeader` → `SiteGnb variant=\"member\"`,",
      "import { Foo } from './foo';",
    ].join('\n');
    const out = stripComments(src);
    expect(out).not.toContain('AppHeader');
    expect(out).not.toContain('SiteGnb');
    expect(out, '실제 import 까지 지우면 조용히 0이 된다').toContain('Foo');
  });

  it('`/home` 은 주석에서만 헤더를 말한다 — 실제로는 그리지 않는다', () => {
    // 지휘부 19 · 실측 18 의 갈림이 정확히 이 파일이었다. **회귀 잠금으로 남긴다.**
    const raw = readFileSync('src/app/(member)/home/page.tsx', 'utf8');
    expect(raw, '주석이 사라졌으면 이 잠금의 뜻도 사라진다').toContain('`AppHeader` →');
    expect(headerImportsOf('src/app/(member)/home/page.tsx'), 'page.tsx 는 헤더를 import 하지 않는다').toEqual([]);
  });
});

describe('무헤더 라우트 목록이 문서와 실측에서 같다', () => {
  it('`design_system.md` 가 실측 그대로의 목록을 들고 있다', () => {
    const doc = readFileSync('design_system.md', 'utf8');
    const free = (routeHeaderMap() as { route: string; hits: string[] }[])
      .filter((r) => !r.hits.length).map((r) => r.route).sort();
    expect(free.length, '무헤더가 하나도 없다 — 도구가 고장 났을 것이다').toBeGreaterThan(0);
    for (const r of free) {
      expect(doc, `무헤더 목록에 ${r} 가 없다 — 실측이 정본이다`).toContain(r);
    }
    // **수는 박지 않는다**(값의 두 분류 ⑴) — 목록만 박고 수는 산출로 얻는다.
    expect(doc, '산출 명령이 없다').toContain('node scripts/shellAudit.mjs --routes');
  });
});

describe('이월 목록 — 비면 완성이다 (U-3 → U-4)', () => {
  it('**모든 이월에 덩이와 사유가 있다** — 적지 않으면 영구가 된다', () => {
    for (const c of cfg.carryOver) {
      expect(c.chunk.length, `${c.item} 에 덩이가 없다`).toBeGreaterThan(0);
      expect(c.why.length, `${c.item} 에 사유가 없다`).toBeGreaterThan(30);
    }
  });

  // ★★★ **회기 이름의 자리가 옮겨졌다 — 근거를 전부 적고 각각 판정한다**(불변식 22).
  //
  //   ⑴ **최박사 결재 2026-09-01**: *「`subtitle` 은 표가 들지 않고 **본문이 든다**. 차수 이름·비교
  //      문구는 **서버 데이터**라 라우트의 성질이 아니다. `/matrix`·`/values` 는 기수 이름을,
  //      `/group` 은 비교 문구를 **본문 첫 줄**에 그린다.」*
  //      → 이 결재가 **막으려던 것**은 «라우트 표가 서버 데이터를 드는 것» 이다. **그것은 지금도 지킨다** —
  //        회기 이름은 `SCREEN_CHROME` 을 지나지 않고 회기 레이아웃이 서버에서 읽어 띠에 넘긴다.
  //
  //   ⑵ **그 결재가 서 있던 사실**: *「실측상 이 화면 어디에도 기수 이름이 없었다」*(U-3 후속 주석).
  //      → **그 사실이 U-5 에서 뒤집혔다.** 띠에 회기 칩이 서면서 같은 문자열이 한 화면에 **둘**이 됐다
  //        (`/matrix`·`/values`·`/member` 셋 — U-6 실측). 근거가 사라지면 결론도 다시 판정해야 한다.
  //
  //   ⑶ **지휘부 결재 2026-09-03**: *「모든 기능을 빠짐없이 제공하되 **중복없이**, **일관된 위치**에서」*
  //      → 회기 이름의 «일관된 위치» 는 **띠의 칩**이다(회기 안 여덟 화면 전부에 선다).
  //        본문 셋만 따로 드는 것은 그 자체가 불일치다.
  //
  //   **그래서 잠금을 뒤집는다** — 이제 재는 것은 «본문이 회기 이름을 그리지 **않는가**» 다.
  //   지우면 *중복이 다시 생겨도 아무도 모른다* 가 되므로, 지우지 않고 방향만 바꾼다.
  it('**회기 이름은 띠의 칩만 든다** — 본문이 또 그리지 않는다(지휘부 결재 2026-09-03)', () => {
    const band = readFileSync('src/app/_screens/console/ConsoleBand.tsx', 'utf8');
    // ⑦ **물 것이 실재하는가** — 칩이 없으면 이 잠금은 «이름을 아무도 안 든다» 를 통과시킨다.
    expect(band, '띠가 회기 이름을 안 그린다 — 그러면 이름을 드는 곳이 0이 된다').toContain('{name}');
    for (const f of ['matrix/page.tsx', 'values/page.tsx', 'member/[userId]/MemberJourney.tsx']) {
      const src = readFileSync(`src/app/coach/cohort/[cohortId]/${f}`, 'utf8');
      const noComment = src.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(noComment, `${f} 가 회기 이름을 또 그린다 — 칩과 합쳐 한 화면에 둘이다`).not.toMatch(/\{cohort\.name\}|\{cohortName\}/);
    }
    // `/group` 의 비교 문구는 회기 이름이 아니다 — 그대로 본문이 든다(최박사 결재의 나머지 절반).
    const group = readFileSync('src/app/coach/cohort/[cohortId]/group/page.tsx', 'utf8');
    expect(group, 'group 이 비교 문구를 안 그린다').toContain('회기 평균`');
  });
});
