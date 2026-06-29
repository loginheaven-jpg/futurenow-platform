import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ToastProvider } from './ToastProvider';

describe('ToastProvider', () => {
  const html = renderToStaticMarkup(
    <ToastProvider>
      <p>자식내용</p>
    </ToastProvider>,
  );

  it('children 통과(서버 트리 보존)', () => {
    expect(html).toContain('자식내용');
  });

  it('접근성 컨테이너 — role=status, aria-live=polite', () => {
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });
});
