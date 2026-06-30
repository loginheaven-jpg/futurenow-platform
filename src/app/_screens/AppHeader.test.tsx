import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppHeader } from './AppHeader';

const noop = () => {};

describe('AppHeader 모드 셸 (X2a — 동선 규칙 강제)', () => {
  it("variant='root': 로고=홈 링크, 뒤로 없음", () => {
    const html = renderToStaticMarkup(<AppHeader variant="root" title="퓨처나우" subtitle="내 자리" homeHref="/home" />);
    expect(html).toContain('퓨처나우');
    expect(html).toContain('href="/home"'); // 로고가 홈 복귀 겸함
    expect(html).not.toContain('aria-label="뒤로"'); // root 는 뒤로 없음
    expect(html).toContain('--navy-300'); // 부제 옅은 네이비(골드 아님)
  });

  it("variant='sub': ‹뒤로(backHref) + 제목 + 항상 홈 아이콘", () => {
    const html = renderToStaticMarkup(<AppHeader variant="sub" title="봄 1기" subtitle="진행 중" backHref="/coach" homeHref="/coach" />);
    expect(html).toContain('봄 1기');
    expect(html).toContain('aria-label="뒤로"');
    expect(html).toContain('aria-label="홈"'); // 홈 복귀 항상 열림
    expect(html).toContain('href="/coach"');
  });

  it("variant='sub' + onBack(콜백): backHref 없으면 button 뒤로", () => {
    const html = renderToStaticMarkup(<AppHeader variant="sub" title="새 차수" onBack={noop} />);
    expect(html).toContain('aria-label="뒤로"');
    expect(html).toContain('<button'); // 콜백 뒤로(위저드 단계 등)
  });

  it("variant='flow': 제목+부제만, 출구(뒤로·홈·로고) 없음", () => {
    const html = renderToStaticMarkup(<AppHeader variant="flow" title="참여 코드" subtitle="안내" />);
    expect(html).toContain('참여 코드');
    expect(html).toContain('--navy-300'); // 부제 옅은 네이비(골드 아님)
    expect(html).not.toContain('aria-label="뒤로"'); // 출구 없음
    expect(html).not.toContain('aria-label="홈"');
    expect(html).not.toContain('--color-accent'); // 레거시 골드 부제 제거됨
  });
});
