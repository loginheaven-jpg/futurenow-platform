// 전역 로딩 — 동적 라우트(force-dynamic 다수) 전환 시 빈 화면 대신 담담한 표시. 최소(텍스트).
import type { CSSProperties } from 'react';

const wrap: CSSProperties = {
  minHeight: '60dvh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'var(--space-6)',
};

export default function Loading() {
  return (
    <main style={wrap} aria-busy="true" aria-live="polite">
      <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>불러오는 중…</p>
    </main>
  );
}
