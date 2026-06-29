'use client';
// 토스트 한 줄(프레젠테이션). 종류별 색은 **절제** — 좌측 가는 보더만(성공=골드 accent, 실패=danger 최소, 정보=중립).
// 의미색 남발 금지(피드백 보더 한 줄). aria-live 는 컨테이너(ToastProvider)가 보유.
import type { CSSProperties } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

const BORDER: Record<ToastKind, string> = {
  success: 'var(--color-accent)',
  error: 'var(--color-danger)',
  info: 'var(--color-border-strong)',
};

const box: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  minWidth: 240,
  maxWidth: '90vw',
  padding: 'var(--space-3) var(--space-4)',
  background: 'var(--color-surface-2)',
  border: 'var(--border-hair) solid var(--color-border)',
  borderRadius: 'var(--radius)',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
};

export function ToastItem({ kind, message, onClose }: { kind: ToastKind; message: string; onClose: () => void }) {
  return (
    <div style={{ ...box, borderLeft: `3px solid ${BORDER[kind]}` }}>
      <span className="t-body" style={{ flex: 1, color: 'var(--color-text)', margin: 0 }}>{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        style={{ minWidth: 'var(--tap-min)', minHeight: 'var(--tap-min)', border: 0, background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );
}
