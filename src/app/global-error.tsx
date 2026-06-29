'use client';
// 루트 레이아웃 에러 대체 — 루트 레이아웃을 갈음하므로 자체 <html><body> 포함.
// 루트 css(globals/ui) 로드가 보장되지 않으므로 인라인 스타일 + 토큰 폴백(var(--token, 하드코딩))으로 견고화.
// 스택·message·digest 화면 비노출(digest 내부 로깅용). 최소 카피 + 다시 시도.
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[global error] digest:', error?.digest ?? '(none)');
  }, [error]);

  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: 'Pretendard, system-ui, -apple-system, sans-serif', background: 'var(--color-bg, #ffffff)', color: 'var(--color-text, #211e1a)' }}>
        <main
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-primary, #1b2a41)', margin: 0 }}>잠시 문제가 생겼어요</h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--color-text-secondary, #6b655c)', margin: 0 }}>
            잠시 후 다시 시도해 주세요.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ minHeight: 44, padding: '0 24px', borderRadius: 10, border: 0, background: 'var(--color-primary, #1b2a41)', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
          >
            다시 시도
          </button>
        </main>
      </body>
    </html>
  );
}
