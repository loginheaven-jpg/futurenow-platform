'use client';
// 부품 전시 화면 본체 (4차 F-1 · 발주 §2 — "/preview/site 에 9종 전시").
//
// **4폭 육안 확인용**이다(1280·1024·768·390). 부품을 실제 화면에 얹기 전에 여기서 먼저 본다 —
//   2차 §11 이 가르쳐 준 것이 그것이다(마크업이 정상인데 화면이 답을 안 할 수 있다).
// 표시 데이터는 `galleryFixture` 한 곳이고 스크린샷 하네스도 같은 것을 쓴다.
import { useState } from 'react';
import { SiteHero } from './SiteHero';
import { GrowAxis } from './GrowAxis';
import { CardBand3 } from './CardBand3';
import { WeekTimeline } from './WeekTimeline';
import { SiteRoleCard } from './RoleCard';
import { QuickTiles } from './QuickTiles';
import { SessionChipStrip } from './SessionChipStrip';
import { MenuSheet } from './MenuSheet';
import { SiteGnb } from './SiteGnb';
import { SectionTitle } from './SectionTitle';
import { NewsRow } from './NewsRow';
import { RecruitCard } from './RecruitCard';
import { SiteFooter } from './SiteFooter';
import { LeaderCard } from './LeaderCard';
import { BookPanel } from './BookPanel';
import { LEADERS, BOOK_FACTS, BOOK_INTRO, BOOK_BUY, BOOK_NOTICE, BOOK_BULK, GROWF_SUMMARY } from './siteContent';
import { BAND_CARDS, CHIPS, GNB_ITEMS, GROW_ROWS, MENU_GROUPS, QUICK_TILES, SHEET, WEEK_CELLS } from './galleryFixture';

function Item({ n, name, note, children }: { n: number; name: string; note?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 'var(--space-8)' }}>
      <h2 className="t-caption" style={{ color: 'var(--color-text-secondary)', letterSpacing: '.1em', margin: 0 }}>
        {n} · {name}
      </h2>
      {note ? <p className="t-caption" style={{ color: 'var(--color-text-muted)', margin: '4px 0 0' }}>{note}</p> : null}
      <div style={{ marginTop: 'var(--space-3)' }}>{children}</div>
    </section>
  );
}

export function SiteGallery({ openSheet = false }: { openSheet?: boolean }) {
  const [open, setOpen] = useState(openSheet);
  return (
    <div>
      <Item n={9} name="SiteGnb" note="md↑ 메뉴 6 + 골드 로그인 · md↓ 햄버거 → MenuSheet">
        {/* 전시라 현재 경로를 고정값으로 준다 — 실화면은 `usePathname()` 을 한 번 읽어 내려준다. */}
        <SiteGnb logo={<>퓨처<b>나우</b></>} en="FUTURENOW" items={GNB_ITEMS} currentPath="/about"
                 login={{ href: '/login', label: '로그인' }} sheet={SHEET} />
      </Item>

      <Item n={1} name="SiteHero" note="lg↑ 2단 1.05:0.95 · 헤드라인 52px → 26px">
        <SiteHero
          eyebrow="6주 실행 세미나"
          headline={<>5년 뒤의 나는 <b>지금</b> 정해진다</>}
          lead="설명을 듣는 자리가 아니라 손으로 남기는 자리입니다."
          ctas={[{ href: '/join', label: '신청하기', tone: 'primary' }, { href: '/about', label: '소개 보기', tone: 'ghost' }]}
        />
      </Item>

      <div className="pc-shell" style={{ maxWidth: 1200 }}>
        <Item n={2} name="GrowAxis" note="md↑ 세로 5행 · 그 아래 가로 5점 트랙">
          <div style={{ background: 'var(--color-surface-inverse)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)' }}>
            <GrowAxis rows={GROW_ROWS} />
          </div>
        </Item>

        <Item n={3} name="CardBand3" note="lg↑ 3열 · 그 아래 1열"><CardBand3 cards={BAND_CARDS} /></Item>

        <Item n={4} name="WeekTimeline" note="lg↑ 6열 · 그 아래 2열 · 현재 회차는 prop">
          <WeekTimeline cells={WEEK_CELLS} currentIndex={1} />
        </Item>

        <Item n={5} name="RoleCard(site)" note="네이비 면 + 우상단 골드 방사 원">
          <div style={{ maxWidth: 420 }}>
            <SiteRoleCard badge="예봄 2기" who={<>참여자 · <b>2회차 진행 중</b></>} title="내 회기로 가기"
                          sub="이번 주 갈무리가 열려 있습니다" cta={{ href: '/my/cohorts', label: '회기 홈' }} />
          </div>
        </Item>

        <Item n={6} name="QuickTiles" note="2×2 · 인라인 SVG 아이콘(이모지 아님)">
          <div style={{ maxWidth: 420 }}><QuickTiles tiles={QUICK_TILES} /></div>
        </Item>

        <Item n={8} name="SessionChipStrip" note="완료·진행·열림·잠금 — 잠긴 회차를 감추지 않는다">
          <SessionChipStrip chips={CHIPS} />
        </Item>

        <Item n={10} name="SectionTitle" note="제목 · 부제 · 우측 액션 3슬롯">
          <SectionTitle title="6주 여정" desc="회차마다 도착점이 손에 잡히는 물건으로 남는다"
                        action={<span>더 보기</span>} />
        </Item>

        <Item n={11} name="NewsRow" note="배지 · 제목 · 날짜 · 링크 없으면 링크가 아니다">
          <NewsRow items={[
            { id: 'a', badge: '모집', title: '예봄 2기 — 9월 20일 (일) 시작', href: '#' },
            { id: 'b', title: '1기 수료 소식과 후기', date: '8.02', href: '#' },
            { id: 'c', title: '링크 없는 줄 — 눌리지 않는다', date: '7.28' },
          ]} />
        </Item>

        <Item n={12} name="RecruitCard" note="키커 · 제목 · 본문 · CTA(모집 개폐는 화면이 판정)">
          <div style={{ maxWidth: 360 }}>
            <RecruitCard kicker="NEXT COHORT" title={<>다음 회기를<br />기다리시나요?</>}
                         body="모집이 열리면 가장 먼저 알려 드립니다." cta={{ href: '#', label: '알림 신청' }} />
          </div>
        </Item>

        <Item n={14} name="LeaderCard" note="2인 대등 · 사진 공란 시 이니셜 자리표시자 · maxSize 상한">
          <div className="site-leaders">
            {LEADERS.map((l) => (
              <LeaderCard key={l.name} name={l.name} title={l.title} tagline={l.tagline}
                          bio={l.bio} intro={l.intro}
                          photo={{ alt: l.photo.alt, maxSize: l.photo.maxSize }} />
            ))}
          </div>
        </Item>

        <Item n={15} name="BookPanel" note="표지 자리표시자 · 서지 · 소개 3단락 · ghost 구매 버튼">
          <BookPanel cover={{ alt: '도서 퓨처나우 표지' }} facts={BOOK_FACTS} intro={BOOK_INTRO}
                     buy={BOOK_BUY} notice={BOOK_NOTICE} bulk={BOOK_BULK} />
        </Item>

        <Item n={2} name="GrowAxis — 원고 §3.3 재사용" note="표를 새로 그리지 않는다(사본 둘 방지)">
          <div style={{ background: 'var(--color-surface-inverse)', padding: 'var(--space-5)', borderRadius: 'var(--radius-lg)' }}>
            <GrowAxis rows={GROWF_SUMMARY} />
          </div>
        </Item>

        <Item n={13} name="SiteFooter" note="링크가 없으면 그 줄을 그리지 않는다">
          <SiteFooter org="퓨처나우 · 청계로벤하임" links={[{ href: '#', label: '문의' }]}
                      note="보조 문장 슬롯" />
        </Item>

        <Item n={7} name="MenuSheet" note="우측 시트 · focus trap · ESC · 바깥 탭 닫힘">
          <button type="button" className="ui-btn ui-btn--ghost" onClick={() => setOpen(true)}>
            메뉴 시트 열기
          </button>
        </Item>
      </div>

      <MenuSheet open={open} onClose={() => setOpen(false)} name={SHEET.name} role={SHEET.role}
                 cohort={SHEET.cohort} groups={MENU_GROUPS} chips={CHIPS} />
      <div style={{ height: 'var(--space-8)' }} />
    </div>
  );
}
