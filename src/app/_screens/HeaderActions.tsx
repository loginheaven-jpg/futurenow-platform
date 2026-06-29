'use client';
// 공통 셸 헤더 우측 액션 — [내 정보](/account) + 로그아웃. 세 페르소나(멤버·코치·운영자) 공통.
// AppHeader 의 action 슬롯에 주입(네이비 바 위라 텍스트는 on-accent·밝게). 절제.
// (구 MemberHeaderActions — Step 3.1 에서 콘솔까지 일반화: 동작·표시 불변, 이름·위치만 일반화.)
import { LogoutButton } from './LogoutButton';

export function HeaderActions() {
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
