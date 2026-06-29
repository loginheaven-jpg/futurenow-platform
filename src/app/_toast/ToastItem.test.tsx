import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ToastItem } from './ToastItem';

const noop = () => {};

describe('ToastItem', () => {
  it('메시지 + 닫기 버튼(aria-label)', () => {
    const html = renderToStaticMarkup(<ToastItem kind="info" message="저장됐어요" onClose={noop} />);
    expect(html).toContain('저장됐어요');
    expect(html).toContain('aria-label="닫기"');
  });

  it('종류별 보더 — 성공=accent(골드), 실패=danger 최소', () => {
    expect(renderToStaticMarkup(<ToastItem kind="success" message="x" onClose={noop} />)).toContain('var(--color-accent)');
    expect(renderToStaticMarkup(<ToastItem kind="error" message="x" onClose={noop} />)).toContain('var(--color-danger)');
    expect(renderToStaticMarkup(<ToastItem kind="info" message="x" onClose={noop} />)).toContain('var(--color-border-strong)');
  });
});
