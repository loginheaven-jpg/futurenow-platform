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
            <SiteRoleCard badge="예봄 2기" who={<>참여자 · <b>2회차 진행 중</b></>} title="내 기수로 가기"
                          sub="이번 주 갈무리가 열려 있습니다" cta={{ href: '/my/cohorts', label: '기수 홈' }} />
          </div>
        </Item>

        <Item n={6} name="QuickTiles" note="2×2 · 인라인 SVG 아이콘(이모지 아님)">
          <div style={{ maxWidth: 420 }}><QuickTiles tiles={QUICK_TILES} /></div>
        </Item>

        <Item n={8} name="SessionChipStrip" note="완료·진행·열림·잠금 — 잠긴 회차를 감추지 않는다">
          <SessionChipStrip chips={CHIPS} />
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
