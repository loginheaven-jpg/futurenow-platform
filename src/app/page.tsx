// 루트 현관(/) — 공개 정문. 시안 **P1(PC) · A(폰)** 를 한 화면으로 조립한다(4차 F-2).
//
// **한 화면이 둘을 덮는다.** 시안이 P1·A 로 나뉜 것은 폭이 다르기 때문이지 화면이 둘이어서가
//   아니다. 부품이 §3.1 브레이크포인트로 접히므로 라우트를 둘로 두지 않는다 —
//   둘로 두면 문안이 두 곳에서 흔들린다(사본이 둘 · 불변식 23).
//
// **ISR 을 깨지 않는다**(S-4 · ADR-110 계열). `cookies()` 를 부르지 않으므로 라우트가 동적으로
//   바뀌지 않는다. 현관은 카톡으로 수십 명이 동시에 여는 링크라 요청마다 DB 를 때리면 안 된다.
//   `SiteGnb` 가 클라이언트 부품이지만 그것은 **번들 경계**이지 렌더 모드가 아니다.
//
// **문안은 시안 문구를 그대로 놓았다** — 히어로 카피 확정은 지휘부 감수 몫이다(개요 §5).
//   확정 문안이 오면 이 파일의 문자열만 바뀐다. 구조는 부품이 들고 있다.
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { SiteGnb } from '@/app/_screens/site/SiteGnb';
import { SiteHero } from '@/app/_screens/site/SiteHero';
import { GrowAxis } from '@/app/_screens/site/GrowAxis';
import { SectionTitle } from '@/app/_screens/site/SectionTitle';
import { CardBand3 } from '@/app/_screens/site/CardBand3';
import { WeekTimeline } from '@/app/_screens/site/WeekTimeline';
import { NewsRow, type NewsRowItem } from '@/app/_screens/site/NewsRow';
import { RecruitCard } from '@/app/_screens/site/RecruitCard';
import { SiteFooter } from '@/app/_screens/site/SiteFooter';
import { PUBLIC_NAV, PUBLIC_FOOTER_LINKS, SITE_ORG } from '@/app/_screens/site/publicNav';
import { recentNews } from '@/app/_lib/publicNews';
import { CURRENT_INTAKE } from '@/app/recruit/intake';
import { shortDate } from '@/app/_lib/shortDate';
import { GROW_ROWS, BAND_CARDS, WEEK_CELLS } from '@/app/_screens/site/programCopy';

export const revalidate = 300;

const asideNote: CSSProperties = { fontSize: 12.5, color: 'var(--navy-300)', marginTop: 'var(--space-4)' };

export default async function Home() {
  const news = await recentNews(3);

  // 시안 소식 첫 줄은 **모집 공지**다(`모집` 배지 + `예봄 2기 — 9월 20일 시작`).
  //   그 줄만 DB 가 아니라 `CURRENT_INTAKE` 에서 온다 — 모집은 소식 글이 아니라 상태이고,
  //   글로 적어 두면 기수가 바뀔 때 두 곳을 고쳐야 한다(기수 변경은 `intake.ts` 한 파일 규율).
  const intakeRow: NewsRowItem[] =
    CURRENT_INTAKE.status === 'open'
      ? [{
          id: 'intake',
          badge: '모집',
          title: `${CURRENT_INTAKE.label} — ${CURRENT_INTAKE.schedule[0]?.date ?? ''} 시작`,
          href: '/recruit',
        }]
      : [];

  const newsRows: NewsRowItem[] = [
    ...intakeRow,
    ...news.map((n) => ({ id: n.id, title: n.title, date: shortDate(n.publishedAt), href: `/news/${n.id}` })),
  ];

  return (
    <>
      <SiteGnb
        logo={<>퓨처<b>나우</b></>}
        en="FUTURE NOW"
        items={PUBLIC_NAV}
        currentPath="/"
        login={{ href: '/login', label: '로그인' }}
      />

      <main>
        <SiteHero
          eyebrow={`6주의 여정 · ${CURRENT_INTAKE.label}`}
          headline={<>미래의 나를<br />오늘로 <b>데려오다</b></>}
          lead="도서 『퓨처나우』를 바탕으로 한 6주 세미나. 읽는 책이 아니라 쓰는 책이다. 매주 손으로 쓰고, 함께 나누고, 한 걸음을 걷는다."
          ctas={[
            { href: '/recruit', label: '참여 신청', tone: 'primary' },
            { href: '/about', label: '프로그램 소개', tone: 'ghost' },
          ]}
          aside={
            <>
              <GrowAxis rows={GROW_ROWS} />
              {/* 코드 지름길을 히어로에 남긴다 — 옛 현관의 `코드로 입장` 이 사라지면
                  링크만 받은 참여자가 들어올 문이 없어진다(기존 기능 회귀 0). */}
              <p style={asideNote}>
                코드를 받으셨나요? <Link href="/join" style={{ color: 'var(--color-accent-strong)', textDecoration: 'underline' }}>코드로 입장</Link>
              </p>
            </>
          }
        />

        <section className="site-section">
          <SectionTitle title="이 세미나가 하는 일" desc="설명하지 않고 쓰게 한다" />
          <CardBand3 cards={BAND_CARDS} />
        </section>

        <section className="site-section">
          <SectionTitle title="6주 여정" desc="회차마다 도착점이 손에 잡히는 물건으로 남는다" />
          {/* **현재 회차를 표시하지 않는다.** 공개 현관에는 '지금 몇 회차'라는 것이 없다 —
              방문자마다 다르고, 기수마다 다르다. 시안의 `.wk.on` 두 칸은 시안 제작 시의
              시각 강조이지 상태가 아니다(완주 보고 §대조표에 그대로 적었다). */}
          <WeekTimeline cells={WEEK_CELLS} />
        </section>

        <section className="site-section">
          {/* **소식이 없으면 `더 보기` 를 주지 않는다** — 누르면 빈 목록이 나온다.
              옛 현관이 지키던 규율이고(`page.test.tsx`), 구조가 바뀌어도 그대로 지킨다.
              구획 자체는 남는다 — 모집 줄과 모집 카드가 그 자리를 채우기 때문이다. */}
          <SectionTitle title="소식" action={news.length > 0 ? <Link href="/news">더 보기</Link> : undefined} />
          <div className="site-newsband">
            {/* 소식이 하나도 없으면 `NewsRow` 가 스스로 아무것도 그리지 않는다.
                그래도 모집 줄은 남으므로 이 구획이 통째로 비는 일은 모집이 닫혔을 때뿐이다. */}
            <NewsRow items={newsRows} />
            <RecruitCard
              kicker="NEXT COHORT"
              title={<>다음 기수를<br />기다리시나요?</>}
              body="모집이 열리면 가장 먼저 알려 드립니다. 교회·기관 단위 도입도 문의로 받습니다."
              cta={{ href: '/contact', label: '알림 신청' }}
            />
          </div>
        </section>
      </main>

      <SiteFooter
        org={SITE_ORG}
        links={PUBLIC_FOOTER_LINKS}
        note={
          <>
            인도자로 활동하실 분은 <Link href="/signup" style={{ color: 'var(--color-accent-strong)', textDecoration: 'underline' }}>인도자 회원가입</Link>
          </>
        }
      />
    </>
  );
}
