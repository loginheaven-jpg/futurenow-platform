'use client';
// 갈무리 세로 보기의 회차별 전문 접힘(ADR-118).
//
// **네이티브 `<details>` 를 쓰지 않는다.** 브라우저가 비열림 상태의 자식을 UA 규칙으로 감추므로
//   `@media print` 에서 펼친 채 인쇄시키는 것이 기기마다 다르게 동작한다.
//   ADR-77 의 `report-raw-content` 가 이미 검증한 방식을 그대로 쓴다 —
//   화면은 `display:none/block`, 인쇄는 globals.css 가 `.journey-full-content` 를 강제 표시.
import { useState, type ReactNode } from 'react';

export function JourneyCollapsible({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: 'var(--border-hair) solid var(--color-border)', padding: 'var(--space-3) 0' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="no-print t-caption"
        style={{
          width: '100%',
          minHeight: 'var(--tap-min)',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'var(--color-text-secondary)',
        }}
      >
        <span>{label}</span>
        <span style={{ color: 'var(--color-text-muted)' }} aria-hidden>{open ? '▲' : '▼'}</span>
      </button>
      {/* 인쇄에만 나오는 제목 — 토글 버튼은 no-print 라 종이에서는 이 줄이 그 자리를 대신한다. */}
      <div className="print-only t-caption" style={{ color: 'var(--color-text-secondary)' }}>{label}</div>
      <div className="journey-full-content" style={{ display: open ? 'block' : 'none', marginTop: 'var(--space-3)' }}>
        {children}
      </div>
    </div>
  );
}
