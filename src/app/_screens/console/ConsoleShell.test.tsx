import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
// **문 이름은 한 곳에서 온다**(U-4 §3) — 단언도 그 출처를 읽는다. 값을 손으로 옮기면 사본이 둘이다.
import { ACCOUNT_DOOR, CONSOLE_DOOR, HOME_DOOR } from '@/app/_vocab/doors';
import { ACCOUNT_GROUP } from '@/app/_lib/memberSheet';
import { consoleSheet } from './consoleSheet';
import { SCREEN_CHROME } from '@/app/_lib/screenChrome';

// 콘솔 껍데기 — **화면에서 옮겨온 단언이 사는 자리** (U-3 · U-5 로 갱신).
//
// U-5 가 제목바를 걷었다. 그래서 이 파일이 답하는 물음이 하나 늘었다 —
//   *제목바가 들던 넷이 어디로 갔는가.* 옮겼으면 여기 있고, 없으면 사라진 것이다.
const mockNav = (pathname: string) =>
  vi.doMock('next/navigation', () => ({
    usePathname: () => pathname,
    useParams: () => ({}),
    useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  }));

const COHORT = '/coach/cohort/00000000-0000-0000-0000-000000000000';
const sheetOf = (role: 'coach' | 'admin') => ({ name: 'QA 인도자', role: '인도자', groups: consoleSheet(role) });

async function render(pathname: string, role: 'user' | 'coach' | 'admin') {
  vi.resetModules();
  mockNav(pathname);
  const { ConsoleShell } = await import('./ConsoleShell');
  return renderToStaticMarkup(
    <ConsoleShell role={role} sheet={role === 'user' ? null : sheetOf(role)}>
      <div id="본문" />
    </ConsoleShell>,
  );
}

describe('콘솔 껍데기 — 벨트 한 겹', () => {
  it('**좌측 사이드바가 없다** — 최박사 확정(PC 도 예외 없다)', async () => {
    const html = await render('/coach', 'coach');
    expect(html, '사이드바가 남아 있다').not.toContain('console-nav');
  });

  it('**띠가 하나다** — 제목바를 걷었다(지휘부 결재 2026-09-03)', async () => {
    const html = await render(`${COHORT}/checkin`, 'coach');
    // 벨트가 `<header>` 하나를 그린다. 제목바(`AppHeader`)를 되살리면 **둘**이 되어 이 줄이 붉어진다.
    expect(html.split('<header').length - 1, '머리 띠가 둘 이상이다 — 제목바가 되살아났다').toBe(1);
  });

  it('**문은 하나씩이다**(U-4 §4) — 햄버거가 벨트 하나뿐이다', async () => {
    const html = await render(`${COHORT}/checkin`, 'coach');
    expect(html.split('site-gnb__burger').length - 1, '메뉴 여는 자리가 둘이다').toBe(1);
  });

  it('**시트가 벨트에 실제로 닿는다** — 제목바 도구가 갈 곳이다', async () => {
    // 닫힌 시트는 정적 그림에 나오지 않는다(실측). 그래서 **배선**을 잰다 —
    //   `SiteGnb` 는 `sheet` 를 받을 때만 `has-sheet` 를 붙인다. 담기는 항목은
    //   `consoleSheet.test.ts` 가 따로 잠근다(둘을 합치면 어느 쪽이 깨졌는지 모른다).
    const html = await render('/coach', 'coach');
    expect(html, '벨트가 시트를 못 받았다 — 폰에서 메뉴가 통째로 사라진다').toContain('has-sheet');
    const labels = consoleSheet('coach').flatMap((g) => g.items.map((i) => i.label));
    expect(labels).toContain(ACCOUNT_DOOR.label);
    expect(labels).toContain(CONSOLE_DOOR.label);
  });

  it('**로그아웃이 붙을 구획이 실재한다** — 레이아웃이 이 이름으로 동작을 얹는다', () => {
    // `ConsoleLayout` 이 `g.title === ACCOUNT_GROUP` 로 로그아웃을 붙인다.
    //   이름이 어긋나면 **조용히 안 붙는다** — 그 어긋남을 여기서 잡는다(불변식 23).
    expect(consoleSheet('coach').map((g) => g.title)).toContain(ACCOUNT_GROUP);
  });

  it('**띠는 껍데기가 그리지 않는다** — 회기 레이아웃이 든다', async () => {
    const html = await render(`${COHORT}/checkin`, 'coach');
    expect(html, '껍데기가 띠를 그렸다 — 이름 없이 그리게 된다').not.toContain('console-tabs');
  });

  it('**탭이 없는 화면은 이름을 본문 첫 줄이 든다**(결재 물음 2 답)', async () => {
    const html = await render('/coach/cohorts', 'coach');
    expect(html).toContain('console-title');
    const entry = SCREEN_CHROME['/coach/cohorts'];
    // 표에서 읽는다 — 이름을 여기 손으로 적으면 사본이 둘이다(불변식 23).
    expect(entry.kind, '표가 이 화면을 제목바로 적고 있지 않다').toBe('bar');
    expect(html).toContain(entry.kind === 'bar' ? entry.title : '');
  });

  it('**회기 안에서는 본문 제목을 그리지 않는다** — 띠가 이미 말한다', async () => {
    const html = await render(`${COHORT}/checkin`, 'coach');
    expect(html, '띠와 본문이 같은 말을 두 번 한다').not.toContain('console-title');
  });

  it('참여자에게는 껍데기를 두르지 않는다 — 대조군', async () => {
    const html = await render('/coach', 'user');
    expect(html).toBe('<div id="본문"></div>');
  });

  it('**「내 홈」은 콘솔 시트에 없다** — 인도자의 홈이 곧 이 화면이다', () => {
    const labels = consoleSheet('coach').flatMap((g) => g.items.map((i) => i.label));
    expect(labels).not.toContain(HOME_DOOR.label);
  });
});
