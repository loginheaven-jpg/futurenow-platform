'use client';
// 공통 셸 헤더 우측 액션 — (선택)전환 링크 + [내 정보](/account) + 로그아웃. 세 페르소나 공통.
// AppHeader 의 action 슬롯에 주입(네이비 바 위라 텍스트는 on-accent·밝게). 절제.
// nav(navHref+navLabel): 맥락 전환 링크. 운영자 콘솔의 [본부]→/admin, 본부의 [코치 콘솔]→/coach (Step 3.정비).
//   호출부가 role 로 노출을 결정(예: isAdmin 일 때만 전달) — HeaderActions 는 받은 값만 렌더.
import { LogoutButton } from './LogoutButton';

const linkStyle = {
  color: 'var(--color-text-on-accent)',
  textDecoration: 'none',
  minHeight: 'var(--tap-min)',
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0 var(--space-2)',
} as const;

export function HeaderActions({ navHref, navLabel }: { navHref?: string; navLabel?: string }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
      {navHref && navLabel ? (
        <a href={navHref} className="t-caption" style={linkStyle}>
          {navLabel}
        </a>
      ) : null}
      <a href="/account" className="t-caption" style={linkStyle}>
        내 정보
      </a>
      <LogoutButton />
    </div>
  );
}
