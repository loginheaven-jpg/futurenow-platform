// 루트 현관(/) — 두 갈래 진입(참여하기·인도자 로그인). 참여자 팔레트·디자인 토큰, 의미색 0.
// 정적 가능: env 의존 없음, 일반 앵커(라우터 컨텍스트 불요). 계약·DB 무변경.
import type { CSSProperties } from 'react';

const cta: CSSProperties = { width: '100%', textDecoration: 'none' };

export default function Home() {
  return (
    <main
      style={{
        maxWidth: 420,
        margin: '0 auto',
        padding: 'var(--space-8) var(--space-4)',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <h1 className="t-display" style={{ color: 'var(--color-primary)', margin: '0 0 var(--space-3)' }}>퓨처나우</h1>
      <p className="t-body-lg" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-8)' }}>
        지금의 나를 가만히 들여다보고, 한 걸음을 그려 보는 진단이에요. 5분이면 충분합니다.
      </p>

      {/* 참여자 = 골드 흔적(주요 진입) */}
      <a className="ui-btn" href="/join" style={{ ...cta, background: 'var(--color-accent)', color: 'var(--color-text-on-gold)' }}>
        참여하기
      </a>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0 var(--space-6)', textAlign: 'center' }}>
        인도자에게 받은 코드로 입장합니다.
      </p>

      {/* 인도자 = 보조 진입(네이비 ghost) */}
      <a className="ui-btn ui-btn--ghost" href="/login" style={cta}>
        인도자 로그인
      </a>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0 0', textAlign: 'center' }}>
        처음이세요? <a href="/signup" style={{ color: 'var(--color-primary)' }}>인도자 회원가입</a>
      </p>
    </main>
  );
}
