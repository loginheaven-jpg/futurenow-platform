// 루트 현관(/) — 공개 소개 현관(진입-1). 스크롤 마케팅: 권유부+CTA(첫 화면) → 소개 3단락 → 인도자 진입(하단).
// 청년 대상 — 큰 골드 CTA(초대) + 작은 코드 보조 링크(지름길), 둘 다 /join 합류. AppHeader 미사용(권유 문구가 h1).
// 참여자 팔레트·디자인 토큰, 의미색 0. 정적(env·라우터 컨텍스트 불요). 계약·DB 무변경.
import type { CSSProperties } from 'react';

const full: CSSProperties = { width: '100%', textDecoration: 'none' };
const divider: CSSProperties = { borderTop: 'var(--border-hair) solid var(--color-border)', margin: 'var(--space-8) 0' };

function IntroBlock({ title, body }: { title: string; body: string }) {
  return (
    <section style={{ marginBottom: 'var(--space-6)' }}>
      <h2 className="t-body" style={{ color: 'var(--color-primary)', fontWeight: 600, margin: '0 0 var(--space-1)' }}>{title}</h2>
      <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{body}</p>
    </section>
  );
}

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

      {/* 소개 세 단락 — 스크롤(랜딩 직접 방문 공통 소개) */}
      <div style={divider} />
      <IntroBlock title="어떤 시간인가요" body="청년이 자기 삶의 방향을 스스로 발견하도록 돕는 다주차 세미나입니다. 답을 주입하는 강의가 아니라, 스스로 묻고 발견하도록 설계된 구조입니다." />
      <IntroBlock title="무엇이 달라지나요" body="지금의 나를 직면하고, 되고 싶은 미래 자아를 구체적인 상으로 그리며, 그 사이를 잇는 행동을 자기 손으로 설계합니다." />
      <IntroBlock title="어떻게 진행되나요" body="짧은 사전 진단으로 시작합니다. 몇 주에 걸쳐 함께 모여 나누고, 세미나가 끝나면 다시 진단으로 변화를 확인합니다." />

      {/* 인도자 진입 — 보조(하단·ghost, 청년 현관이라 우선순위 낮게) */}
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
