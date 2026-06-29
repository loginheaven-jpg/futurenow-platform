import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import NotFound from './not-found';

describe('not-found (전역 404)', () => {
  const html = renderToStaticMarkup(<NotFound />);
  it('안내 카피 + 홈 링크', () => {
    expect(html).toContain('찾는 페이지가 없어요');
    expect(html).toContain('href="/"');
  });
  it('의미색 토큰 0(중립)', () => {
    expect(html).not.toMatch(/--care|--danger|--warning/);
  });
});
