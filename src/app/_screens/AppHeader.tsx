// 공용 화면 헤더(앱 레이어) — 네이비 바. 모드 기반(variant 필수): 동선 규칙을 셸이 강제한다.
//   variant='root' : 로고(홈 링크) + 우측 액션. 뒤로 없음(홈은 로고가 겸함).
//   variant='sub'  : ‹뒤로(backHref 우선, 없으면 onBack 콜백) + 제목 + 우측 홈 아이콘(항상) + 액션.
//   variant='flow' : 제목 + (선택)부제만. 로고·뒤로·홈·액션 없음 — 진입 선형 플로우(진단)용, 일부러 출구 없음.
// backHref 는 문자열(서버 컴포넌트 호환). onBack 콜백은 위저드 단계 뒤로 등 콜백이 필요한 sub 에서만.
// (X2a~진입-1b: 레거시 분기 제거·variant 필수 승격 완료 — 미지정 호출처 0.)
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

const barStyle: CSSProperties = {
  background: 'var(--color-primary)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-4)',
  marginBottom: 'var(--space-6)',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
};
const ON_ACCENT = 'var(--color-text-on-accent)';
const iconLink: CSSProperties = {
  minWidth: 'var(--tap-min)',
  minHeight: 'var(--tap-min)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: ON_ACCENT,
  textDecoration: 'none',
  fontSize: 22,
};

import { HOME_DOOR } from '@/app/_vocab/doors';

export function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

export function AppHeader({
  variant,
  title,
  subtitle,
  backHref,
  homeHref = '/home',
  onBack,
  action,
}: {
  variant: 'root' | 'sub' | 'flow'; // 필수 — 동선 모드
  title: ReactNode;
  subtitle?: ReactNode;
  backHref?: string; // sub 뒤로 경로(문자열, 서버 호환). backHref 우선
  homeHref?: string; // 홈 복귀 경로(A′-2/ADR-51 통합 홈 — 전 화면 /home. 기본 /home)
  onBack?: () => void; // 콜백 뒤로(위저드 단계 등 backHref 로 표현 불가한 경우 — sub 전용)
  action?: ReactNode; // 우측 액션 슬롯(HeaderActions 등 — root/sub 전용)
}) {
  // 제목 블록(sub·flow 공용): 제목 + 옅은 네이비 부제
  const titleBlock = (
    // flex:1 로 제목이 남는 공간을 차지 → 우측 홈 아이콘을 끝으로 밀어 겹침 방지. 넘치면 말줄임.
    <div style={{ minWidth: 0, flex: 1 }}>
      <div className="t-h1" style={{ color: ON_ACCENT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      {subtitle ? <div className="t-caption" style={{ color: 'var(--navy-300)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div> : null}
    </div>
  );

  return (
    <header style={barStyle}>
      {variant === 'root' ? (
        // root: 로고(홈 링크)가 제목 겸함
        <div>
          {/* 로고 = 서비스 정체성(제목이 접근성 이름). 홈 복귀는 우측 라벨드 홈 컨트롤이 담당(A′-5 역할 명료화). 로고도 홈으로 링크(브랜드 관례). */}
          <Link className="ui-tappable" href={homeHref} style={{ textDecoration: 'none' }}>
            <span className="t-h1" style={{ color: ON_ACCENT }}>{title}</span>
          </Link>
          {subtitle ? <div className="t-caption" style={{ color: 'var(--navy-300)' }}>{subtitle}</div> : null}
        </div>
      ) : variant === 'sub' ? (
        <>
          {backHref ? (
            <Link className="ui-tappable" href={backHref} aria-label="뒤로" style={{ ...iconLink, marginLeft: 'calc(-1 * var(--space-2))' }}>‹</Link>
          ) : onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="뒤로"
              style={{ ...iconLink, marginLeft: 'calc(-1 * var(--space-2))', border: 0, background: 'transparent', cursor: 'pointer' }}
            >
              ‹
            </button>
          ) : null}
          {titleBlock}
        </>
      ) : (
        // flow: 제목 + 부제만(출구 없음 — 진단 선형성)
        titleBlock
      )}

      {variant !== 'flow' ? (
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {/* 이름은 `_vocab/doors` 하나에서 온다(U-4 §3) — 아이콘뿐이라 이 이름이 곧 그 문의 이름이다. */}
          {variant === 'sub' ? (
            <Link className="ui-tappable" href={homeHref} aria-label={HOME_DOOR.label} style={iconLink}>
              <HomeIcon />
            </Link>
          ) : null}
          {action}
        </div>
      ) : null}
    </header>
  );
}
