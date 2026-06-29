'use client';
// 멤버 셸 헤더 우측 액션 — [내 정보](/account) + 로그아웃. AppHeader 의 action 슬롯에 주입.
// 네이비 헤더 위라 링크 텍스트는 on-accent(밝게). 절제.
import { LogoutButton } from './LogoutButton';

export function MemberHeaderActions() {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
      <a
        href="/account"
        className="t-caption"
        style={{
          color: 'var(--color-text-on-accent)',
          textDecoration: 'none',
          minHeight: 'var(--tap-min)',
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0 var(--space-2)',
        }}
      >
        내 정보
      </a>
      <LogoutButton />
    </div>
  );
}
