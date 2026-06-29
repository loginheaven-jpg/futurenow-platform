import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Loading from './loading';

describe('loading (전역 로딩)', () => {
  it('담담한 로딩 표시', () => {
    const html = renderToStaticMarkup(<Loading />);
    expect(html).toContain('불러오는 중');
    expect(html).toContain('aria-busy="true"');
  });
});
