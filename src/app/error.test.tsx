import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ErrorBoundary from './error'; // 전역 Error 와 충돌 피하려 별칭

describe('error (세그먼트 바운더리 — 민감정보 비노출)', () => {
  const secret = 'SECRET_at_/internal/db/path';
  const err = Object.assign(new Error(secret), { digest: 'digest_abc123', stack: 'STACKTRACE_LINE' });
  const html = renderToStaticMarkup(<ErrorBoundary error={err} reset={() => {}} />);

  it('담담한 고정 카피 + [다시 시도] + 홈', () => {
    expect(html).toContain('잠시 문제가 생겼어요');
    expect(html).toContain('다시 시도');
    expect(html).toContain('href="/"');
  });

  it('스택·message·digest·내부 경로 화면 비노출', () => {
    expect(html).not.toContain(secret);
    expect(html).not.toContain('STACKTRACE_LINE');
    expect(html).not.toContain('digest_abc123');
    expect(html).not.toMatch(/internal\/db/);
  });
});
