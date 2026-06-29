import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Home from './page';

describe('루트 현관 (/) — 두 갈래 진입', () => {
  const html = renderToStaticMarkup(<Home />);

  it('참여하기 → /join, 인도자 로그인 → /login 링크', () => {
    expect(html).toContain('href="/join"');
    expect(html).toContain('참여하기');
    expect(html).toContain('href="/login"');
    expect(html).toContain('인도자 로그인');
  });

  it('인도자 회원가입 진입 → /signup (Step 3.정비)', () => {
    expect(html).toContain('href="/signup"');
    expect(html).toContain('회원가입');
  });

  it('옛 플레이스홀더 문구 제거', () => {
    expect(html).not.toMatch(/토대 구축 단계|디자인 시스템 확정 후/);
  });

  it('참여자 화면 — 의미색 토큰 없음', () => {
    expect(html).not.toMatch(/--care|--danger|--warning/);
  });
});
