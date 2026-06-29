// 전역 404 — 없는 경로. 공개 화면(인증 무관)·참여자 팔레트·중립(의미색 0). 계약·DB 무관.
import type { CSSProperties } from 'react';

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

export default function NotFound() {
  return (
    <main style={wrap}>
      <h1 className="t-h1" style={{ color: 'var(--color-primary)', margin: 0 }}>찾는 페이지가 없어요</h1>
      <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
        주소가 바뀌었거나 사라진 페이지예요.
      </p>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 404 복귀는 전체 새로고침(<a>)이 적절(셸·인증무관) */}
      <a className="ui-btn ui-btn--primary" href="/" style={{ textDecoration: 'none', minWidth: 160 }}>홈으로</a>
    </main>
  );
}
