import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// 콘솔 껍데기 — **화면에서 옮겨온 단언이 사는 자리** (U-3).
//
// 사이드바를 걷으며 무엇이 사라졌는지가 이 파일이 답한다. 옮겼으면 여기 있고,
//   없으면 사라진 것이다 — 지휘부가 «없어지는 것이 하나라도 있으면 멈추라» 한 자리다.
const mockNav = (pathname: string) =>
  vi.doMock('next/navigation', () => ({
    usePathname: () => pathname,
    useParams: () => ({}),
    useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  }));

const COHORT = '/coach/cohort/00000000-0000-0000-0000-000000000000';

describe('콘솔 껍데기 — 상단바 하나 + 탭 줄 한 단계', () => {
  it('**좌측 사이드바가 없다** — 최박사 확정(PC 도 예외 없다)', async () => {
    vi.resetModules(); mockNav('/coach');
    const { ConsoleShell } = await import('./ConsoleShell');
    const html = renderToStaticMarkup(<ConsoleShell role="coach"><div /></ConsoleShell>);
    expect(html, '사이드바가 남아 있다').not.toContain('console-nav');
    expect(html, '상단바가 없다').toContain('<header');
  });

  it('**홈 아이콘과 로그아웃·내 정보를 잃지 않았다** (화면에서 옮겨온 단언)', async () => {
    vi.resetModules(); mockNav('/coach/cohorts');
    const { ConsoleShell } = await import('./ConsoleShell');
    const html = renderToStaticMarkup(<ConsoleShell role="coach"><div /></ConsoleShell>);
    expect(html).toContain('aria-label="홈"');
    expect(html, '메뉴 여는 자리가 없다').toContain('site-gnb__burger');
  });

  it('**탭 줄은 한 단계다** — 두 단계를 만들지 않는다', async () => {
    vi.resetModules(); mockNav(`${COHORT}/checkin`);
    const { ConsoleShell } = await import('./ConsoleShell');
    const html = renderToStaticMarkup(<ConsoleShell role="coach"><div /></ConsoleShell>);
    const tabRows = html.split('console-tabs').length - 1;
    expect(tabRows, '탭 줄이 둘 이상이다').toBe(1);
  });

  it('**차수 밖에서는 탭 줄이 서지 않는다** — 갈 곳 없는 탭을 그리지 않는다', async () => {
    vi.resetModules(); mockNav('/admin');
    const { ConsoleShell } = await import('./ConsoleShell');
    const html = renderToStaticMarkup(<ConsoleShell role="admin"><div /></ConsoleShell>);
    expect(html).not.toContain('console-tabs');
  });

  it('참여자에게는 껍데기를 두르지 않는다 — 대조군', async () => {
    vi.resetModules(); mockNav('/coach');
    const { ConsoleShell } = await import('./ConsoleShell');
    const html = renderToStaticMarkup(<ConsoleShell role="user"><div id="본문" /></ConsoleShell>);
    expect(html).toBe('<div id="본문"></div>');
  });
});
