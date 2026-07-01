import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// HeaderActions 는 usePathname(자기참조 판정) + useRouter(LogoutButton) 를 직접 쓴다 — 주입식이 아니라 모킹.
let mockPathname = '/account';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));

import { HeaderActions } from './HeaderActions';

describe('HeaderActions — 홈 링크 노출 규칙(A1 · 항목5 홈으로 가기)', () => {
  it('homeHref 미전달: 홈 링크 없음(sub 화면 — AppHeader 홈 아이콘과 중복 회피)', () => {
    mockPathname = '/coach/cohort/abc';
    const html = renderToStaticMarkup(<HeaderActions />);
    expect(html).not.toContain('aria-label="홈"');
    expect(html).toContain('내 정보'); // 기본 액션(내 정보·로그아웃)은 유지
  });

  it('homeHref 전달 + 현재 경로 다름(/account): 홈 아이콘 링크 노출', () => {
    mockPathname = '/account';
    const html = renderToStaticMarkup(<HeaderActions homeHref="/home" />);
    expect(html).toContain('aria-label="홈"');
    expect(html).toContain('href="/home"');
  });

  it('homeHref == 현재 경로(이미 홈): 홈 링크 생략(자기참조 방지)', () => {
    mockPathname = '/coach';
    const html = renderToStaticMarkup(<HeaderActions homeHref="/coach" />);
    expect(html).not.toContain('aria-label="홈"');
  });

  it('본부(/admin): 자기참조라 홈 생략, [코치 콘솔] 전환 링크는 노출', () => {
    mockPathname = '/admin';
    const html = renderToStaticMarkup(<HeaderActions homeHref="/admin" navHref="/coach" navLabel="코치 콘솔" />);
    expect(html).not.toContain('aria-label="홈"');
    expect(html).toContain('코치 콘솔');
    expect(html).toContain('href="/coach"');
  });
});
