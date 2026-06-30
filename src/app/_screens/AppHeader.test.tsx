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

  it('레거시(variant 미지정): 기존 렌더 호환 — onBack 버튼 + 부제 골드 유지', () => {
    const html = renderToStaticMarkup(<AppHeader title="제목" subtitle="부제" onBack={noop} />);
    expect(html).toContain('제목');
    expect(html).toContain('aria-label="뒤로"');
    expect(html).toContain('--color-accent'); // X2b 전까지 부제 골드 유지(무변경)
  });
});
