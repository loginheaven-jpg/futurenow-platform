import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemberHome } from './MemberHome';

describe('MemberHome (멤버 홈 본문)', () => {
  const html = renderToStaticMarkup(<MemberHome greetingName="이멤버" />);

  it('인사 + 1차 행동([코드로 세미나 참여] → /join)', () => {
    expect(html).toContain('이멤버님');
    expect(html).toContain('코드로 세미나 참여');
    expect(html).toContain('href="/join"');
  });

  it('[내 차수] → /my/cohorts 활성 링크(Step 1.2)', () => {
    expect(html).toContain('내 차수');
    expect(html).toContain('href="/my/cohorts"');
  });

  it('참여자 화면 — 의미색 토큰 0', () => {
    expect(html).not.toMatch(/--care|--danger|--warning/);
  });
});
