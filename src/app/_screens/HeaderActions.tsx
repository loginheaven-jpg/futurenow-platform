'use client';
// 공통 셸 헤더 우측 액션 — (선택)홈 아이콘 + (선택)전환 링크 + [내 정보](/account) + 로그아웃. 세 페르소나 공통.
// AppHeader 의 action 슬롯에 주입(네이비 바 위라 텍스트는 on-accent·밝게). 절제.
// homeHref: 홈 복귀 경로. root 화면 호출부가 "그 화면의 홈"(역할 거점 — /home·/coach·/admin)을 전달한다.
//   usePathname 으로 현재 경로와 같으면(=이미 홈) 홈 링크를 생략(자기참조 방지). → 실제 노출은 /account·/my/cohorts 등 홈이 아닌 root.
//   sub 화면은 AppHeader(variant='sub')가 홈 아이콘을 이미 렌더하므로 homeHref 를 넘기지 않는다(중복 회피).
// nav(navHref+navLabel): 맥락 전환 링크. 운영자 콘솔의 [본부]→/admin, 본부의 [코치 콘솔]→/coach (Step 3.정비).
//   호출부가 role 로 노출을 결정(예: isAdmin 일 때만 전달) — HeaderActions 는 받은 값만 렌더.
import { usePathname } from 'next/navigation';
import { LogoutButton } from './LogoutButton';
import { HomeIcon } from './AppHeader';

const linkStyle = {
  color: 'var(--color-text-on-accent)',
  textDecoration: 'none',
  minHeight: 'var(--tap-min)',
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0 var(--space-2)',
} as const;

export function HeaderActions({ homeHref, navHref, navLabel }: { homeHref?: string; navHref?: string; navLabel?: string }) {
  const pathname = usePathname();
  // 현재 화면이 곧 홈이면 홈 링크 생략(자기참조 방지 — /home·/coach·/admin 에서 스스로 가리키지 않음).
  const showHome = homeHref != null && pathname !== homeHref;
  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
      {showHome ? (
        // 홈 복귀 = 라벨드 컨트롤(아이콘 + '홈' 텍스트) — 인지성 강화(A′-5). 자기참조(현재=홈)면 위에서 생략.
        <a href={homeHref} aria-label="홈" className="t-caption" style={{ ...linkStyle, gap: 'var(--space-1)' }}>
          <HomeIcon />
          홈
        </a>
      ) : null}
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
