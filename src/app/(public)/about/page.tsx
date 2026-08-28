// 소개 상세(/about) — 공개. 4차 **F-2b** 에서 원고 §1~§4 를 반영해 확장.
//
// **구성 순서는 발주 `site_v2_4_F2b` §4 그대로다** — 세미나 → 소개 3단락 → GROW+F → 6주 여정
//   → 인도자 2 → 도서 → 참여 대상 → 신청 CTA → 푸터.
//
// **문안은 한 글자도 고치지 않는다**(발주 §2). 본문은 `siteContent.ts` 가 들고, 그 파일은
//   원고에서 **뽑아 넣은 것**이지 옮겨 적은 것이 아니다. 여기서 문장을 쓰지 않는다.
//
// **시안이 없는 화면**이라 형태는 발주 §3 이 승인한 사양만 쓴다(불변식 20).
//   §9.7 부품과 기존 `ui-` 공용 부품 밖의 형태를 새로 짓지 않았다.
import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHero } from '@/app/_screens/site/SiteHero';
import { GrowAxis } from '@/app/_screens/site/GrowAxis';
import { SectionTitle } from '@/app/_screens/site/SectionTitle';
import { WeekTimeline } from '@/app/_screens/site/WeekTimeline';
import { LeaderCard } from '@/app/_screens/site/LeaderCard';
import { BookPanel } from '@/app/_screens/site/BookPanel';
import { WEEK_CELLS } from '@/app/_screens/site/programCopy';
import {
  LEADERS, BOOK_FACTS, BOOK_INTRO, BOOK_BUY, BOOK_NOTICE, BOOK_BULK,
  GROWF_SUMMARY, AUDIENCE_PARA, AUDIENCE_LIST,
} from '@/app/_screens/site/siteContent';
import { SeminarIntro } from '@/app/_screens/SeminarIntro';

export const metadata: Metadata = { title: '퓨처나우 소개' };

export default function AboutPage() {
  return (
    <>
      {/* **헤더·푸터는 껍데기가 그린다**(U-1 · `design_system.md` §12.3 규칙 1).
          여기 있던 `PublicGnb`·`SiteFooter` 호출은 `(public)/layout.tsx` 로 올라갔다.
          화면은 본문만 그린다 — 자기가 어느 껍데기에 사는지는 **경로가 말한다.** */}

      <>
        {/* 히어로에는 GROW 축을 두지 않는다 — 아래 §3.3 구획이 같은 축을 **원고 문안**으로 든다.
            둘 다 두면 한 화면에 같은 축이 서로 다른 라벨로 두 번 선다(사본이 둘 · 불변식 23). */}
        <SiteHero
          eyebrow="프로그램 소개"
          headline={<>읽는 책이 아니라<br /><b>쓰는</b> 책이다</>}
          lead="여섯 번의 자리에서 매번 손으로 남긴다. 설명을 듣고 끝나는 시간이 아니라, 쓰고 나누고 한 걸음을 걷는 시간입니다."
        />

        <section className="site-section">
          <SectionTitle title="퓨처나우 세미나" desc="무엇을 하는 시간인가" />
          {/* 단일 출처. 이 안의 문장은 여기서 고치지 않는다 — `SeminarIntro` 를 고치면 세 화면이 함께 움직인다. */}
          <SeminarIntro />
        </section>

        <section className="site-section site-section--dark">
          <SectionTitle title="GROW + F" desc="코칭 모델 GROW 에 믿음(Faith)을 더한 다섯 축" />
          {/* 원고 §3.3 — **새 표를 그리지 않고 `GrowAxis` 가 받는다**(발주 §3).
              md↓ 는 `short`(목표·현재·선택·실행·믿음), md↑ 는 원고의 한 줄이 그대로 선다. */}
          <GrowAxis rows={GROWF_SUMMARY} />
        </section>

        <section className="site-section">
          <SectionTitle title="6주 여정" desc="회차마다 도착점이 손에 잡히는 물건으로 남는다" />
          <WeekTimeline cells={WEEK_CELLS} />
        </section>

        <section className="site-section">
          <SectionTitle title="인도자" desc="가르치기보다, 먼저 걸어본 사람으로 동행한다" />
          {/* **두 사람 대등**(발주 §1-4) — 같은 부품·같은 슬롯. 순서는 원고 §1·§2 그대로다. */}
          <div className="site-leaders">
            {LEADERS.map((l) => (
              <LeaderCard
                key={l.name}
                name={l.name}
                title={l.title}
                tagline={l.tagline}
                bio={l.bio}
                intro={l.intro}
                // 사진 3종은 아직 없다(원고 §6.2 — 공란). `src` 를 주지 않으면 자리표시자가 선다.
                photo={{ alt: l.photo.alt, maxSize: l.photo.maxSize }}
              />
            ))}
          </div>
        </section>

        <section className="site-section">
          <SectionTitle title="도서 『퓨처나우』" desc="책이 지도라면 세미나는 동행이다" />
          <BookPanel
            cover={{ alt: '도서 퓨처나우 표지 — 꿈꾸는 미래를 지금 살라' }}
            facts={BOOK_FACTS}
            intro={BOOK_INTRO}
            buy={BOOK_BUY}
            notice={BOOK_NOTICE}
            bulk={BOOK_BULK}
          />
        </section>

        <section className="site-section">
          <SectionTitle title="이런 분께 권합니다" />
          {/* 발주 §2 — lg↑ 단락형(§4.1) / md↓ 리스트형(§4.2). **화면당 하나만** 보인다. */}
          <p className="site-aud__para">{AUDIENCE_PARA}</p>
          <ul className="site-aud__list">
            {AUDIENCE_LIST.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>

          {/* 신청 CTA — **골드 primary 는 세미나 신청 전용**이다(원고 §3.4 위계). 도착점은 `/join`. */}
          <div className="site-cta">
            <Link
              href="/join"
              className="ui-btn ui-btn--primary"
              style={{ background: 'var(--color-accent)', color: 'var(--color-text-on-gold)', textDecoration: 'none' }}
            >
              세미나 신청하기
            </Link>
            <span className="site-cta__note">
              코드를 받으셨다면 같은 자리에서 입장하실 수 있습니다.
            </span>
          </div>
        </section>
      </>

    </>
  );
}
