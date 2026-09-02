'use client';
// 부품 9 · SiteGnb — 시안 P1 `.gnb` (4차 F-1 · 발주 §3-9).
//
// 네이비 바 · 좌 로고 + EN 소제 · 우 메뉴 6 + 골드 로그인.
//
// **두 모습이 있다.** `public` 은 시안 P1 `.gnb`(공개 현관)이고, `member` 는 시안 B `.topbar`
//   (로그인 홈)로 **로고 + 햄버거뿐**이다. 로그인한 사람에게 메뉴 줄과 로그인 버튼을 다시 보일
//   이유가 없다 — 그 자리를 시트(#7)가 통째로 든다.
// **md↓ 에서는 햄버거가 되고 #7 MenuSheet 를 부른다.** 시트의 열림 상태를 여기가 갖는다 —
//   시트는 스스로 열리지 않는다(부품은 계산하지 않는다 · 지휘부 강조 ①).
//
// **현재 경로는 prop 이다.** 처음에는 `usePathname()` 으로 부품 안에서 읽었고,
//   *"내비가 자기 위치를 아는 것은 판정이 아니라 관찰"* 이라고 적어 두기까지 했다. **틀렸다.**
//   라우터도 데이터원이고(§5-4 "부품에 데이터 접근 금지 — 전부 prop"),
//   `pathname === href || startsWith` 는 명백한 **판정**이다(강조 ① 은 9종 전부에 걸린다).
//   선례도 반대쪽이었다 — `consoleNav(pathname)` 은 **pathname 을 인자로 받는 순수 함수**였지
//   훅을 안에서 부르는 물건이 아니었다. 화면이 한 번 읽어 내려준다.
import { useState } from 'react';
import Link from 'next/link';
import { MenuSheet, type MenuGroup } from './MenuSheet';
import type { SessionChip } from './SessionChipStrip';
import './site.css';

export interface GnbItem {
  href: string;
  label: string;
}

export function SiteGnb({
  logo,
  en,
  items = [],
  login,
  currentPath,
  variant = 'public',
  sheet,
  transparent = false,
}: {
  /** 로고 문안. 강조 부분은 `<b>` 슬롯으로 — 부품이 문장을 쪼개지 않는다. */
  logo: React.ReactNode;
  /** 로고 옆 영문 소제(자간 .2em) */
  en?: string;
  /**
   * 띠를 **투명하게** 둘 것인가(ADR-171). 히어로 배경 장면이 헤드벨트까지 이어지게 한다.
   *
   * **부품이 정하지 않는다** — 「어느 화면인가」는 화면 층(`PublicGnb`)이 안다.
   *   이 띠는 `position: static` 이라 **스크롤하면 화면 밖으로 나간다**(라이브 실측 2026-09-02).
   *   그래서 밝은 구획에 닿을 때 흰 글자가 흰 바탕에 남는 일이 없고, 굳히는 장치도 필요 없다.
   */
  transparent?: boolean;
  /** 공개 현관의 메뉴 6. `member` 에서는 비운다 — 시트가 내비다. */
  items?: GnbItem[];
  /** 로그인 버튼. **로그인한 사람에게는 주지 않는다**(없으면 그리지 않는다). */
  login?: { href: string; label: string };
  /**
   * `public`(기본) — 시안 P1 `.gnb`: md↑ 메뉴 + 골드 로그인 · md↓ 햄버거.
   * `member` — 시안 B `.topbar`: **로고 + 햄버거뿐**이다. 폭과 무관하게 시트가 내비다.
   */
  variant?: 'public' | 'member';
  /** 지금 경로. 화면이 `usePathname()` 을 한 번 읽어 내려준다. 없으면 아무 항목도 현재가 아니다. */
  currentPath?: string;
  /** md↓ 햄버거가 여는 시트의 내용. 없으면 햄버거를 그리지 않는다. */
  sheet?: { name: string; role?: string; cohort?: string; groups: MenuGroup[]; chips?: SessionChip[] };
}) {
  const [open, setOpen] = useState(false);
  // 하위 경로도 현재로 친다 — `/library/3` 에서 서가가 꺼져 보이면 내비가 거짓말을 한다.
  const isCurrent = (href: string) =>
    currentPath !== undefined && (currentPath === href || currentPath.startsWith(`${href}/`));

  return (
    <>
      <header className={`site-gnb${transparent ? ' is-transparent' : ''}`}>
        <Link href="/" className="site-gnb__brand">
          <span className="site-gnb__logo">{logo}</span>
          {en ? <span className="site-gnb__en">{en}</span> : null}
        </Link>

        {/* **로그인은 nav 밖에 둔다.** 안에 두면 md↓ 에서 메뉴와 함께 숨어
            폰 방문자가 로그인할 자리를 잃는다(F-2 390px 캡처가 잡았다). */}
        {/* **시트가 있으면 햄버거를 md↑ 에서도 보인다**(ADR-174).
            전에는 `is-member` 하나가 그 일을 했는데, 그 이름은 「멤버 화면」이라는 뜻이라
            **로그인한 공개 현관**에는 안 맞았다 — 거기도 메뉴 여섯과 시트를 함께 든다.
            그래서 조건을 **가진 것**으로 바꿨다: 시트를 받았으면 여는 문이 있어야 한다.
            `is-member` 는 그대로 둔다 — 그 화면은 메뉴가 없어 시트가 유일한 내비다. */}
        <div className={`site-gnb__right${variant === 'member' ? ' is-member' : ''}${sheet ? ' has-sheet' : ''}`}>
          {items.length > 0 ? (
            <nav className="site-gnb__nav" aria-label="주 메뉴">
              {items.map((it) => (
                <Link key={it.href} href={it.href} aria-current={isCurrent(it.href) ? 'page' : undefined}>
                  {it.label}
                </Link>
              ))}
            </nav>
          ) : null}
          {login ? <Link href={login.href} className="site-gnb__login">{login.label}</Link> : null}

        {sheet ? (
          <button
            type="button"
            className="site-gnb__burger"
            onClick={() => setOpen(true)}
            aria-label="전체 메뉴 열기"
            aria-expanded={open}
          >
            {/* 햄버거 문자 기호 대신 인라인 SVG — currentColor 로 통제된다(발주 §5-3). */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="1.8" strokeLinecap="round" aria-hidden focusable="false">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        ) : null}
        </div>
      </header>

      {sheet ? (
        <MenuSheet
          open={open}
          onClose={() => setOpen(false)}
          name={sheet.name}
          role={sheet.role}
          cohort={sheet.cohort}
          groups={sheet.groups}
          chips={sheet.chips}
        />
      ) : null}
    </>
  );
}
