import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SHEET_FIXTURE } from '@/app/(member)/home/homeFixture';
import { readFileSync } from 'node:fs';
import { HOME_DOOR, CONSOLE_DOOR } from '@/app/_vocab/doors';

// 회원 껍데기 — **화면에서 옮겨온 단언이 사는 자리** (U-2).
//
// `HomeScreen` 테스트가 재던 «로고 + 햄버거뿐» 을 지우지 않고 여기로 올렸다.
//   지우면 *로그인한 사람에게 로그인 버튼이 다시 뜨지 않는가* 를 아무도 재지 않게 된다.
const mockNav = (pathname: string, params: Record<string, string> = {}) =>
  vi.doMock('next/navigation', () => ({
    usePathname: () => pathname,
    useParams: () => params,
    // `HeaderActions` 안의 로그아웃이 라우터를 쓴다 — 껍데기를 재려면 함께 있어야 한다.
    useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  }));

describe('회원 껍데기 — 표를 읽어 헤더를 그린다', () => {
  it('**GNB 라우트는 메뉴 여섯을 든다** (ADR-174 로 뒤집힌 잠금)', async () => {
    // **옛 사실은 「로고 + 햄버거뿐」이었다.** 그래서 로그인하면 메뉴가 사라졌고,
    //   지휘부가 *「벨트는 유지되고 버튼만 햄버거로 바뀐다」* 로 그것을 고치라 했다.
    //   **지키던 것은 「시트가 내비다」가 아니라 「머리는 껍데기가 그린다」**이므로 그쪽을 잰다.
    vi.resetModules(); mockNav('/home');
    const { MemberShell: Shell } = await import('./MemberShell');
    const html = renderToStaticMarkup(<Shell sheet={SHEET_FIXTURE}><div /></Shell>);
    expect(html, '메뉴가 사라졌다').toContain('site-gnb__nav');
    // 시트를 여는 문도 함께 있다 — 둘 다 든다.
    expect(html).toContain('site-gnb__burger');
  });
  it('**제목 바 라우트는 표의 제목을 그린다** — 화면이 넘기지 않는다', async () => {
    vi.resetModules(); mockNav('/feed');
    const { MemberShell: Shell } = await import('./MemberShell');
    const html = renderToStaticMarkup(<Shell sheet={SHEET_FIXTURE}><div /></Shell>);
    expect(html).toContain('동행');
    expect(html, '뒤로는 규칙이 아니라 표의 값이다 — /feed 는 조상이 `/` 라 값으로 박았다')
      .toContain('href="/home"');
  });

  it('★ **flow 에는 메뉴가 없다** — 일부러 없앤 출구를 껍데기가 되살리지 않는다', async () => {
    vi.resetModules(); mockNav('/my/values');
    const { MemberShell: Shell } = await import('./MemberShell');
    const html = renderToStaticMarkup(<Shell sheet={SHEET_FIXTURE}><div /></Shell>);
    expect(html, 'flow 화면에 메뉴 단추가 달렸다').not.toContain('site-gnb__burger');
  });

  it('대조군 — flow 가 아닌 제목 바에는 메뉴가 있다', async () => {
    vi.resetModules(); mockNav('/account');
    const { MemberShell: Shell } = await import('./MemberShell');
    const html = renderToStaticMarkup(<Shell sheet={SHEET_FIXTURE}><div /></Shell>);
    expect(html).toContain('site-gnb__burger');
  });

  it('**껍데기 없음이면 헤더를 안 그린다** — 문안이 없는 자리다', async () => {
    vi.resetModules(); mockNav('/c/ZR4KB/values', { code: 'ZR4KB' });
    const { MemberShell: Shell } = await import('./MemberShell');
    const html = renderToStaticMarkup(<Shell sheet={SHEET_FIXTURE}><div id="본문" /></Shell>);
    expect(html).toBe('<div id="본문"></div>');
  });

  it('**본문을 그대로 통과시킨다**', async () => {
    vi.resetModules(); mockNav('/account');
    const { MemberShell: Shell } = await import('./MemberShell');
    const html = renderToStaticMarkup(<Shell sheet={SHEET_FIXTURE}><div id="본문" /></Shell>);
    expect(html).toContain('id="본문"');
  });
  // ── U-4 §4 — **문은 하나씩이다.** 탐침이 아니라 잠금으로 남긴다.
  //   실측으로 잡은 결함이다: `sub` + `actions` 세 화면이 한 바에 홈을 **둘** 그렸다.
  //   `AppHeader` 가 `sub` 에서 홈 아이콘을 그리는데 껍데기가 `HeaderActions` 에도 홈을 넘겼다.
  it.each(['/my/cohorts/co1/journey', '/my/cohorts/co1/report', '/my/cohorts/co1/checkin/1'])(
    '★ %s — 상단바의 홈 문이 **하나**다',
    async (path) => {
      vi.resetModules(); mockNav(path, { cohortId: 'co1', session: '1' });
      const { MemberShell: Shell } = await import('./MemberShell');
      const html = renderToStaticMarkup(<Shell sheet={SHEET_FIXTURE}><div /></Shell>);
      expect((html.match(/aria-label="내 홈"/g) ?? []).length, '같은 문이 둘이다').toBe(1);
    },
  );

  it('대조군 — `root` 에서는 `HeaderActions` 가 그 문을 든다(사라지지 않았다)', async () => {
    vi.resetModules(); mockNav('/account');
    const { MemberShell: Shell } = await import('./MemberShell');
    const html = renderToStaticMarkup(<Shell sheet={SHEET_FIXTURE}><div /></Shell>);
    expect((html.match(/aria-label="내 홈"/g) ?? []).length).toBe(1);
    expect(html, '이름은 `_vocab/doors` 가 든다').toContain(HOME_DOOR.label);
  });

  it('**이름이 사본으로 갈라지지 않는다**(불변식 23) — 두 부품이 같은 출처를 읽는다', () => {
    for (const f of ['src/app/_screens/HeaderActions.tsx', 'src/app/_screens/AppHeader.tsx']) {
      expect(readFileSync(f, 'utf8'), `${f} 가 문 이름을 스스로 적고 있다`).toContain("from '@/app/_vocab/doors'");
    }
    // 콘솔도 같다 — 시트 항목과 표의 제목이 한 말이다.
    expect(readFileSync('src/app/_screens/console/consoleNav.ts', 'utf8')).toContain('CONSOLE_DOOR');
    expect(readFileSync('src/app/_lib/screenChrome.ts', 'utf8')).toContain(`title: '${CONSOLE_DOOR.label}'`);
  });
});
