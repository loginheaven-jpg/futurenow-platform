// 공용 화면 헤더(앱 레이어) — 네이비 바, 제목 흰색·부제 골드(§1.5). 뒤로 가기 선택.
import type { ReactNode } from 'react';

export function AppHeader({ title, subtitle, onBack }: { title: ReactNode; subtitle?: ReactNode; onBack?: () => void }) {
  return (
    <header
      style={{
        background: 'var(--color-primary)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
      }}
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="뒤로"
          style={{
            minWidth: 'var(--tap-min)',
            minHeight: 'var(--tap-min)',
            border: 0,
            background: 'transparent',
            color: 'var(--color-text-on-accent)',
            fontSize: 22,
            cursor: 'pointer',
            marginLeft: 'calc(-1 * var(--space-2))',
          }}
        >
          ‹
        </button>
      ) : null}
      <div>
        <div className="t-h1" style={{ color: 'var(--color-text-on-accent)' }}>{title}</div>
        {subtitle ? <div className="t-caption" style={{ color: 'var(--color-accent)' }}>{subtitle}</div> : null}
      </div>
    </header>
  );
}
