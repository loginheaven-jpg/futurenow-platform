// 루트 현관(/) — 공개 소개 현관(진입-1). 스크롤 마케팅: 권유부+CTA(첫 화면) → 소개 3단락 → 인도자 진입(하단).
// 참여자 대상 — 큰 골드 CTA(초대) + 작은 코드 보조 링크(지름길), 둘 다 /join 합류. AppHeader 미사용(권유 문구가 h1).
// 참여자 팔레트·디자인 토큰, 의미색 0. 정적(env·라우터 컨텍스트 불요). 계약·DB 무변경.
import type { CSSProperties } from 'react';
import { SeminarIntro } from '@/app/_screens/SeminarIntro';

const full: CSSProperties = { width: '100%', textDecoration: 'none' };
const divider: CSSProperties = { borderTop: 'var(--border-hair) solid var(--color-border)', margin: 'var(--space-8) 0' };

export default function Home() {
  return (
    <main style={{ maxWidth: 430, margin: '0 auto', padding: 'var(--space-8) var(--space-4)' }}>
      {/* 첫 화면 — 권유부 + CTA */}
      <p className="t-caption" style={{ color: 'var(--color-primary)', fontWeight: 600, letterSpacing: 1, margin: '0 0 var(--space-3)' }}>
        퓨처나우
      </p>
      <h1 className="t-display" style={{ color: 'var(--color-primary)', lineHeight: 1.25, margin: '0 0 var(--space-5)' }}>
        5년 뒤의 나는
        <br />
        어떤 사람일까요.
      </h1>
      <p className="t-body-lg" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>
        막연한 질문 같지만, 그 미래의 나를 또렷이 그려 본 사람은 오늘을 다르게 살고, 그래서 미래도 달라집니다.
      </p>
      <p className="t-body-lg" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-8)' }}>
        퓨처나우는 지금의 나를 들여다보고, 되고 싶은 나를 향해 한 걸음을 떼어 보는 시간입니다.
      </p>

      {/* 골드 CTA(초대) — 골드 면 + 네이비 글자(--color-text-on-gold) */}
      <a className="ui-btn" href="/join" style={{ ...full, background: 'var(--color-accent)', color: 'var(--color-text-on-gold)' }}>
        함께 시작해 볼까요?
      </a>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0 0', textAlign: 'center' }}>
        코드가 있으신가요? <a href="/join" style={{ color: 'var(--color-primary)' }}>코드로 입장</a>
      </p>

      {/* 소개 세 단락 — 스크롤(공통 소개, SeminarIntro 단일 출처 — 코드 미리보기와 공유) */}
      <div style={divider} />
      <SeminarIntro />

      {/* 과정·참석 안내(랜딩 전용) */}
      <div
        style={{
          marginTop: 'var(--space-8)',
          padding: 'var(--space-5)',
          background: 'var(--color-accent-soft)',
          borderRadius: 'var(--radius-lg)',
          border: 'var(--border-hair) solid var(--color-border)',
        }}
      >
        <p className="t-body" style={{ color: 'var(--color-text)', margin: '0 0 var(--space-3)' }}>
          특강에 이어 5주의 <strong style={{ color: 'var(--color-primary)' }}>&lsquo;변화+성장+도약 과정&rsquo;</strong>에 참여하실 분은 진단에 응하시면 됩니다.
        </p>
        <p className="t-body" style={{ color: 'var(--color-text)', margin: 0 }}>
          참석비용은 <span style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)' }}>50만원</span> →{' '}
          <strong style={{ color: 'var(--color-primary)' }}>25만원</strong>{' '}
          <span className="t-caption" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>(성도특별할인 50%)</span> 입니다.
        </p>
      </div>

      {/* 인도자 진입 — 보조(하단·ghost, 참여자 현관이라 우선순위 낮게) */}
      <div style={{ ...divider, margin: 'var(--space-8) 0 var(--space-6)' }} />
      <a className="ui-btn ui-btn--ghost" href="/login" style={full}>
        인도자 로그인
      </a>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0 0', textAlign: 'center' }}>
        처음이세요? <a href="/signup" style={{ color: 'var(--color-primary)' }}>인도자 회원가입</a>
      </p>
    </main>
  );
}
