// 따라갈 수 없는 링크를 미리 받아 두지 않는다 (ADR-176).
//
// **왜 이 잠금이 있는가**: ADR-175 의 결함은 *미인증으로 보호 화면을 프리페치* 한 데서 났다.
//   프록시가 로그인으로 되돌린 307 이 라우터 캐시에 남아 로그인 뒤 재사용됐다.
//   처방은 둘이다 — ⑴ 로그인 뒤 **문서를 새로 받는다**(ADR-175) ⑵ **애초에 안 받아 둔다**(여기).
//   ⑴ 만으로도 증상은 사라지지만, ⑵ 는 **버려지는 요청 자체**를 없앤다(실측 1건/로그인 화면).
//
// ★ **여기서는 마크업이 무엇을 넘기는지만 잰다.** 「실제로 프리페치가 나가는가」는
//   `scripts/postdeploy.mjs` 가 **실행으로** 잰다(⑨-c 창의 층이 대상의 층과 다르다).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { SiteGnb } from './SiteGnb';
import { PUBLIC_NAV } from './publicNav';
import { isProtectedPath } from '@/proxy.guard';

const read = (f: string) => readFileSync(f, 'utf8');

describe('★ 미인증이면 보호 링크를 미리 받지 않는다', () => {
  it('벨트 메뉴 중 보호 화면이 **실재한다** — 없으면 이 잠금은 헛돈다(계열 ⑦)', () => {
    const guarded = PUBLIC_NAV.filter((i) => isProtectedPath(i.href));
    expect(guarded.length, '벨트에 보호 링크가 하나도 없다 — 물 것이 없다').toBeGreaterThan(0);
    // 실측 2026-09-02 기준 그 자리는 「진단」 하나다. **수를 박지 않는다** — 있다는 것만 잰다.
    expect(guarded.every((i) => i.href.startsWith('/'))).toBe(true);
  });

  it('★★ 판정을 **프록시와 같은 함수**로 한다 — 사본을 만들지 않는다(불변식 23)', () => {
    const src = read('src/app/_screens/site/SiteGnb.tsx');
    expect(src, '보호 판정을 부품이 따로 적었다').toContain('isProtectedPath');
    expect(src, '프리페치를 안 끈다').toContain('prefetch={');
    // 접두사 목록을 부품이 베껴 쓰면 한쪽만 고쳐지는 날 조용히 어긋난다.
    for (const copy of ["'/home'", "'/coach'", "'/admin'"]) {
      expect(src, `접두사를 베껴 적었다: ${copy}`).not.toContain(copy);
    }
  });

  it('★★ 미인증 산출물에 보호 링크의 프리페치가 꺼져 있다 — **그려서 잰다**', () => {
    const out = renderToStaticMarkup(<SiteGnb logo="로고" items={PUBLIC_NAV} />);
    // Next 의 Link 는 prefetch={false} 를 마크업에 남기지 않으므로 **문자열로는 못 잰다.**
    //   그래서 여기서는 **그려지기는 하는가**(링크가 사라지지 않았는가)만 확인하고,
    //   실제 프리페치 발생 여부는 실행 창이 잰다. 이 단언은 «링크를 지워서 해결» 을 막는다.
    for (const it of PUBLIC_NAV) expect(out, `${it.label} 이 사라졌다`).toContain(it.href);
  });

  it('로그인한 사람에게는 막지 않는다 — 값이 참이면 조건이 통째로 통과다', () => {
    const src = read('src/app/_screens/site/SiteGnb.tsx');
    expect(src).toContain('signedIn || !isProtectedPath(');
    // 기본값이 false 여야 «모르면 안 받아 둔다» 가 된다.
    expect(src, '기본값이 안전한 쪽이 아니다').toContain('signedIn = false');
  });

  it('★ **모든 `<SiteGnb>` 호출부가** 이 값을 넘긴다 — 하나라도 빠지면 그 화면만 조용히 낡는다', () => {
    // ★ 처음엔 「파일에 `signedIn` 이 있는가」로 물었는데 `PublicGnb` 에는 그 낱말이
    //   **다른 자리에도 있어**(`const signedIn = …`) 프롭을 지워도 초록이었다(⑬).
    //   **호출부마다** 본다. 수를 손으로 박지 않는다 — 파일에서 세므로 저절로 따라간다.
    for (const f of ['src/app/_screens/site/PublicGnb.tsx',
                     'src/app/_screens/shell/MemberShell.tsx',
                     'src/app/_screens/console/ConsoleShell.tsx']) {
      const src = read(f);
      const calls = src.split('<SiteGnb').slice(1);
      expect(calls.length, `${f} 에 SiteGnb 호출부가 없다`).toBeGreaterThan(0);
      calls.forEach((seg, i) => {
        // 여는 태그의 끝은 **제 줄에 홀로 선 `/>`** 다.
        //   `indexOf('/>')` 로 닫았더니 **로고의 `</>` 에 먼저 걸렸다** — 창이 실물을 안 덮었다.
        const ls = seg.split(String.fromCharCode(10));
        const endLine = ls.findIndex((l) => l.trim() === '/>');
        expect(endLine, `${f} 의 ${i + 1}번째 호출부가 안 닫힌다`).toBeGreaterThan(-1);
        // ★ 여기서도 한 번 헛돌았다 — `open` 에 `login={signedIn ? …}` 가 있어
        //   **낱말이 있는가**로는 프롭을 지워도 통과했다(⑬). **프롭 이름**으로 잰다.
        // 줄끝 CR(윈도 줄바꿈)이 붙으면 토큰이 어긋나 안 물었다 - 다듬고 자른다.
        const tokens = ls.slice(0, endLine).map((l) => l.trim()).join(' ').split(' ');
        const passes = tokens.some((t) => t === 'signedIn' || t.startsWith('signedIn={'));
        expect(passes, `${f} 의 ${i + 1}번째 SiteGnb 가 signedIn 을 안 넘긴다`).toBe(true);
      });
    }
  });

});

describe('★ 로그인 길의 조회를 줄로 세우지 않는다 (ADR-176)', () => {
  it('착지 액션이 둘을 함께 기다린다 — 서로를 인자로 쓰지 않는다', () => {
    const src = read('src/app/(public)/login/landingAction.ts');
    expect(src, '직렬이다').toContain('Promise.all');
    expect(src).toContain('ctx.currentUser()');
    expect(src).toContain('ctx.listMyCohorts()');
    // 앞의 결과를 뒤가 쓰면 병렬로 묶을 수 없다 — 그 모양이 되돌아오면 붉어진다.
    expect(src, '차수 조회가 me 에 기댄다').not.toMatch(/listMyCohorts\([^)]*me/);
  });

  it('회원 레이아웃이 동의·차수를 함께 기다린다 — **인증 게이트는 그 앞이다**', () => {
    const src = read('src/app/(member)/layout.tsx');
    const gate = src.indexOf("redirect('/login')");
    const par = src.indexOf('Promise.all');
    expect(gate, '인증 게이트가 없다').toBeGreaterThan(-1);
    expect(par, '직렬이다').toBeGreaterThan(-1);
    // 게이트-데이터 순서(불변식 19) — 조회를 게이트 앞으로 끌어올리면 붉어진다.
    expect(par, '조회가 인증 게이트보다 앞에 있다').toBeGreaterThan(gate);
  });
});
