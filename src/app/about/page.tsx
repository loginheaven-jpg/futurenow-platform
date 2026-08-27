// 소개 상세(/about) — 공개. 4차 F-2 에서 부품 조립으로 전면 교체.
//
// **시안이 없는 화면이다.** P1~P4 · A~G 어디에도 소개 상세가 없다. 그래서 **새로 디자인하지
//   않았다** — 승인된 §9.7 부품만으로 조립했고, 새 형태를 하나도 만들지 않았다(불변식 20).
//   시안이 도착하면 이 파일의 배치만 바뀐다.
//
// **문안 단일 출처를 지킨다.** 소개 3단락은 `SeminarIntro` 가 정본이고
//   `/`·`/about`·`CohortPreview` 셋이 공유한다. 여기서 문장을 다시 쓰면 사본이 넷이 된다
//   (1차 발주서 §6 이 지목한 자리 · 불변식 23).
//   여정·GROW 축은 `programCopy.ts` 가 정본이다 — `/` 와 같은 것을 말한다.
import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteGnb } from '@/app/_screens/site/SiteGnb';
import { SiteHero } from '@/app/_screens/site/SiteHero';
import { GrowAxis } from '@/app/_screens/site/GrowAxis';
import { SectionTitle } from '@/app/_screens/site/SectionTitle';
import { CardBand3 } from '@/app/_screens/site/CardBand3';
import { WeekTimeline } from '@/app/_screens/site/WeekTimeline';
import { RecruitCard } from '@/app/_screens/site/RecruitCard';
import { SiteFooter } from '@/app/_screens/site/SiteFooter';
import { PUBLIC_NAV, PUBLIC_FOOTER_LINKS, SITE_ORG } from '@/app/_screens/site/publicNav';
import { GROW_ROWS, BAND_CARDS, WEEK_CELLS } from '@/app/_screens/site/programCopy';
import { SeminarIntro } from '@/app/_screens/SeminarIntro';
import { CURRENT_INTAKE } from '@/app/recruit/intake';

export const metadata: Metadata = { title: '퓨처나우 소개' };

export default function AboutPage() {
  const open = CURRENT_INTAKE.status === 'open';
  return (
    <>
      <SiteGnb
        logo={<>퓨처<b>나우</b></>}
        en="FUTURE NOW"
        items={PUBLIC_NAV}
        currentPath="/about"
        login={{ href: '/login', label: '로그인' }}
      />

      <main>
        <SiteHero
          eyebrow="프로그램 소개"
          headline={<>읽는 책이 아니라<br /><b>쓰는</b> 책이다</>}
          lead="여섯 번의 자리에서 매번 손으로 남긴다. 설명을 듣고 끝나는 시간이 아니라, 쓰고 나누고 한 걸음을 걷는 시간입니다."
          aside={<GrowAxis rows={GROW_ROWS} />}
        />

        <section className="site-section">
          <SectionTitle title="퓨처나우는" desc="무엇을 하는 시간인가" />
          {/* 단일 출처. 이 안의 문장은 여기서 고치지 않는다 — `SeminarIntro` 를 고치면 세 화면이 함께 움직인다. */}
          <SeminarIntro />
        </section>

        <section className="site-section">
          <SectionTitle title="이 세미나가 하는 일" desc="설명하지 않고 쓰게 한다" />
          <CardBand3 cards={BAND_CARDS} />
        </section>

        <section className="site-section">
          <SectionTitle title="6주 여정" desc="회차마다 도착점이 손에 잡히는 물건으로 남는다" />
          {/* `/` 와 같은 이유로 현재 회차를 표시하지 않는다 — 공개 화면에는 '지금'이 없다. */}
          <WeekTimeline cells={WEEK_CELLS} />
        </section>

        <section className="site-section">
          <SectionTitle
            title="참여하기"
            desc="코드를 받으셨다면 바로 입장하실 수 있습니다"
            action={<Link href="/library">자료실</Link>}
          />
          <div className="site-newsband">
            <div className="site-about__ways">
              <Link href="/join" className="ui-card ui-tappable site-about__way">
                <span className="site-about__wayT">코드로 입장</span>
                <span className="site-about__wayS">인도자에게 받은 코드가 있으신 경우</span>
              </Link>
              <Link href="/login" className="ui-card ui-tappable site-about__way">
                <span className="site-about__wayT">로그인</span>
                <span className="site-about__wayS">이미 참여하고 계신 경우</span>
              </Link>
              <Link href="/contact" className="ui-card ui-tappable site-about__way">
                <span className="site-about__wayT">도입 문의</span>
                <span className="site-about__wayS">교회·기관 단위로 진행하실 경우</span>
              </Link>
            </div>
            {/* 모집이 닫혀 있으면 신청 CTA 를 주지 않는다 — **판정은 화면이 하고 부품은 받는다.** */}
            <RecruitCard
              kicker="NEXT COHORT"
              title={open ? <>{CURRENT_INTAKE.label}<br />모집 중입니다</> : <>다음 기수를<br />기다리시나요?</>}
              body={open ? CURRENT_INTAKE.deadlineLine : '모집이 열리면 가장 먼저 알려 드립니다. 교회·기관 단위 도입도 문의로 받습니다.'}
              cta={open ? { href: '/recruit', label: '신청 안내 보기' } : { href: '/contact', label: '알림 신청' }}
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
