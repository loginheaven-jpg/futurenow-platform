import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SHEET_FIXTURE } from '@/app/(member)/home/homeFixture';

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
  it('**GNB 라우트는 로고 + 햄버거뿐이다** (화면에서 옮겨온 단언)', async () => {
    vi.resetModules(); mockNav('/home');
    const { MemberShell: Shell } = await import('./MemberShell');
    const html = renderToStaticMarkup(<Shell sheet={SHEET_FIXTURE}><div /></Shell>);
    expect(html).toContain('site-gnb__burger');
    expect(html, '로그인한 사람에게 로그인 버튼을 다시 보이지 않는다').not.toContain('site-gnb__login');
    expect(html, '메뉴 줄은 시트가 든다').not.toContain('site-gnb__nav');
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
});
