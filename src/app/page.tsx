// 루트 현관(/) — 공개 소개 현관(진입-1). 스크롤 마케팅: 권유부+CTA(첫 화면) → 소개 3단락 → 인도자 진입(하단).
// 참여자 대상 — 큰 골드 CTA(초대) + 작은 코드 보조 링크(지름길), 둘 다 /join 합류. AppHeader 미사용(권유 문구가 h1).
// 참여자 팔레트·디자인 토큰, 의미색 0. 정적(env·라우터 컨텍스트 불요). 계약·DB 무변경.
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { SeminarIntro } from '@/app/_screens/SeminarIntro';
import { recentNews } from '@/app/_lib/publicNews';
import { CURRENT_INTAKE } from '@/app/recruit/intake';

// **ISR 로 정적을 지킨다**(S-4). 소식을 얹으면서 `cookies()` 를 쓰지 않으므로 라우트가
//   동적으로 바뀌지 않는다 — `/recruit` 이 쓰는 것과 같은 구조이고, 그 구조를 깨지 않는다는 지시다.
//   현관은 카톡으로 수십 명이 동시에 여는 링크라 요청마다 DB 를 때리면 안 된다.
export const revalidate = 300;

const full: CSSProperties = { width: '100%', textDecoration: 'none' };
const divider: CSSProperties = { borderTop: 'var(--border-hair) solid var(--color-border)', margin: 'var(--space-8) 0' };

export default async function Home() {
  const news = await recentNews(3);
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
      <Link className="ui-btn" href="/join" style={{ ...full, background: 'var(--color-accent)', color: 'var(--color-text-on-gold)' }}>
        함께 시작해 볼까요?
      </Link>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0 0', textAlign: 'center' }}>
        코드가 있으신가요? <Link href="/join" style={{ color: 'var(--color-primary)' }}>코드로 입장</Link>
      </p>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-1) 0 0', textAlign: 'center' }}>
        이미 참여하셨나요? <Link href="/login" style={{ color: 'var(--color-primary)' }}>로그인</Link>
      </p>

      {/* 소개 세 단락 — 스크롤(공통 소개, SeminarIntro 단일 출처 — 코드 미리보기와 공유) */}
      <div style={divider} />
      <SeminarIntro />

      {/* 모집 배너 — 이번 기수로 보내는 한 줄. 정원·마감 판정은 /recruit 이 하고 여기는 문을 연다. */}
      <div style={divider} />
      <Link className="ui-card ui-tappable" href="/recruit" style={{ display: 'block', textDecoration: 'none', padding: 'var(--space-4)' }}>
        <span className="t-caption" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>이번 기수 모집</span>
        <span className="t-body" style={{ display: 'block', marginTop: 'var(--space-1)' }}>{CURRENT_INTAKE.capacity}</span>
        <span className="t-caption" style={{ display: 'block', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
          일정과 신청 방법 보기
        </span>
      </Link>

      {/* 소식 최근 3건. **없으면 구획째 그리지 않는다** — 빈 제목만 남으면 관리되지 않는 인상이 된다. */}
      {news.length > 0 ? (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 className="t-body" style={{ fontWeight: 600, margin: 0 }}>소식</h2>
            <Link className="t-caption" href="/news" style={{ color: 'var(--color-text-secondary)' }}>더 보기</Link>
          </div>
          <div style={{ marginTop: 'var(--space-3)', display: 'grid', gap: 'var(--space-2)' }}>
            {news.map((n) => (
              <Link key={n.id} href={`/news/${n.id}`} className="ui-listrow ui-listrow--tappable" style={{ textDecoration: 'none' }}>
                <span className="t-body">{n.title}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* 공개 영역 — 소개·자료실·문의. 현관이 정문이라 갈 곳을 한자리에 둔다. */}
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-6)', textAlign: 'center' }}>
        <Link href="/about" style={{ color: 'var(--color-text-secondary)' }}>소개</Link>
        {' · '}
        {/* 소식은 **여기에도** 둔다. 위 소식 구획은 글이 없으면 통째로 사라지는데, 그때
            /news 로 가는 길이 현관에서 완전히 없어진다(자기 테스트가 잡았다). */}
        <Link href="/news" style={{ color: 'var(--color-text-secondary)' }}>소식</Link>
        {' · '}
        <Link href="/library" style={{ color: 'var(--color-text-secondary)' }}>자료실</Link>
        {' · '}
        <Link href="/contact" style={{ color: 'var(--color-text-secondary)' }}>문의</Link>
      </p>

      {/* 로그인·인도자 진입 — 보조(하단·ghost, 참여자 현관이라 우선순위 낮게). 로그인은 전 역할 공용. */}
      <div style={{ ...divider, margin: 'var(--space-8) 0 var(--space-6)' }} />
      <Link className="ui-btn ui-btn--ghost" href="/login" style={full}>
        로그인
      </Link>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0 0', textAlign: 'center' }}>
        인도자로 활동하실 분은 <Link href="/signup" style={{ color: 'var(--color-primary)' }}>인도자 회원가입</Link>
      </p>
    </main>
  );
}
