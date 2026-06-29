'use client';
// 세그먼트 에러 바운더리 — 담담한 고정 카피만. 스택·error.message·digest 화면 비노출(digest는 내부 로깅용).
// 의미색 신중(danger 남발 금지) — 중립 + 최소 강조. 외부 전송(OBS)은 Phase 5.
import { useEffect, type CSSProperties } from 'react';

const wrap: CSSProperties = {
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-4)',
  padding: 'var(--space-6) var(--space-4)',
  textAlign: 'center',
};

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // 내부 추적용 — 화면엔 노출하지 않는다. digest 는 불투명 식별자(서버 로그와 대조). message/stack 미기록.
    console.error('[app error] digest:', error?.digest ?? '(none)');
  }, [error]);

  return (
    <main style={wrap}>
      <h1 className="t-h1" style={{ color: 'var(--color-primary)', margin: 0 }}>잠시 문제가 생겼어요</h1>
      <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
        잠깐 뒤 다시 시도해 주세요. 계속되면 잠시 후 다시 들어와 주세요.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button type="button" onClick={() => reset()} className="ui-btn ui-btn--primary">다시 시도</button>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 에러 복귀는 전체 새로고침(<a>)으로 클라이언트 상태 초기화 */}
        <a href="/" className="ui-btn ui-btn--ghost" style={{ textDecoration: 'none' }}>홈으로</a>
      </div>
    </main>
  );
}
