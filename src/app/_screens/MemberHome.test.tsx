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

  it('[내 차수]는 준비 중·비활성, 죽은 링크 없음(/my/cohorts 미연결)', () => {
    expect(html).toContain('내 차수');
    expect(html).toContain('준비 중');
    expect(html).toContain('disabled');
    expect(html).not.toContain('/my/cohorts'); // 고아 라우트 금지
  });

  it('참여자 화면 — 의미색 토큰 0', () => {
    expect(html).not.toMatch(/--care|--danger|--warning/);
  });
});
