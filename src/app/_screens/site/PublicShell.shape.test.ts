// ★ 껍데기 모양 잠금 — **본문의 자리는 하나다**(비상 수정 2026-08-29).
//
// **막는 것**: 껍데기가 갈래마다 다른 트리를 돌려주면 React 가 `{children}` 을 언마운트하고
//   다시 마운트한다. `useSetChrome` 은 언마운트 때 크롬을 지우므로 **되먹임이 돈다** —
//   크롬 설정 → 갈래 바뀜 → 재마운트 → 크롬 지워짐 → 갈래 되돌아감 → 재마운트 …
//   `/join?code=…` 에서 실제로 돌았다(5초에 `<main>` **175회** 교체 · POST 초당 37회 · 운영 503).
//
// **왜 소스를 재는가**: 이 저장소에는 DOM 테스트 환경이 없어(`renderToStaticMarkup` 뿐)
//   마운트 고리를 단위테스트로 재현할 수 없다. 그래서 **고리가 생길 수 있는 구조**를 잠근다 —
//   *본문 슬롯이 하나인가*. 실제 횟수는 실브라우저로 재고 그 수를 보고서에 적는다.
//   **이 잠금은 물려 봤다**(슬롯을 둘로 늘리면 레드).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// **통로를 읽는 껍데기**는 본문 슬롯이 하나여야 한다 — 크롬이 갈래를 흔들 수 있기 때문이다.
const SHELLS = [
  'src/app/_screens/site/PublicShell.tsx',
  'src/app/_screens/shell/MemberShell.tsx',
];

/** 주석을 걷고 센다 — 주석 속 예시가 수를 흔들면 잠금이 거짓을 지킨다(U-0 도구의 그 교훈). */
function strip(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
}

describe('껍데기 — 본문의 자리가 하나다', () => {
  it.each(SHELLS)('%s — `<main>{children}</main>` 슬롯이 하나다', (f) => {
    const src = strip(readFileSync(f, 'utf8'));
    const slots = (src.match(/\{children\}/g) ?? []).length;
    expect(slots, '본문 슬롯이 여럿이면 갈래마다 자리가 달라져 재마운트가 난다').toBe(1);
  });

  it('★ 공개 껍데기는 **머리·발만 갈리고** 본문 자리는 고정이다', () => {
    const src = strip(readFileSync('src/app/_screens/site/PublicShell.tsx', 'utf8'));
    // 갈래는 값으로 고른다(슬롯 변수), 트리로 고르지 않는다.
    expect(src).toMatch(/const header =/);
    expect(src).toMatch(/const footer =/);
    expect(src).toContain('{header}');
    expect(src).toContain('{footer}');
    // 조기 반환으로 다른 모양을 내보내는 길이 없어야 한다.
    const body = src.slice(src.indexOf('export function PublicShell'));
    const earlyReturns = (body.match(/^\s{2}(if \(.*\) )?return /gm) ?? []).length;
    expect(earlyReturns, '조기 반환이 있으면 모양이 갈린다').toBe(1);
  });

  it('콘솔 껍데기 — 갈래가 **역할**로만 갈린다(런타임에 안 바뀌므로 돌 수 없다)', () => {
    // 콘솔은 본문 자리가 둘이다(참여자면 셸 없이 그대로). **구조를 흔들지 않고 조건을 잠근다** —
    //   조기 반환이 `override`·`chrome` 이 아니라 **`groups`(역할 산출)** 만 본다면 갈래가 흔들리지 않는다.
    //   역할은 서버가 준 prop 이라 한 트리 안에서 바뀌지 않는다.
    //   비상 상황에 콘솔 레이아웃까지 손대지 않기로 한 판단이고, **조건이 그 판단을 지킨다.**
    const src = strip(readFileSync('src/app/_screens/console/ConsoleShell.tsx', 'utf8'));
    const early = src.match(/^\s*if \(.*\) return <>\{children\}<\/>;/m)?.[0] ?? '';
    expect(early, '콘솔의 조기 반환이 사라졌거나 모양이 바뀌었다').toContain('groups.length === 0');
    expect(early, '조기 반환이 크롬을 보면 갈래가 흔들린다').not.toMatch(/override|chrome/);
  });

  it('통로는 **언마운트 때 크롬을 지운다** — 그 정리는 옳고, 지우지 않는다', () => {
    // 정리를 없애면 다음 화면이 옛 제목을 쓴다. 고리의 원인은 정리가 아니라 **모양이 갈린 것**이었다.
    const ctx = readFileSync('src/app/_screens/shell/chromeContext.tsx', 'utf8');
    expect(ctx).toContain('return () => set(null)');
  });
});
