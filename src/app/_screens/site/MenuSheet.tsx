'use client';
// 부품 7 · MenuSheet — 시안 E (4차 F-1 · 발주 §3-7).
//
// **focus trap · ESC · 바깥 탭 닫힘은 게이트 항목이다**(지휘부 강조 ②).
//   *"접근성이 아니라 품질 원칙이다"* — 시트가 열렸는데 탭이 뒤 화면으로 새면 사용자는
//   자기가 어디 있는지 잃는다. 키보드만 쓰는 사람에게는 **갇히는 것이 아니라 놓치는 것**이 문제다.
//
// **부품은 계산하지 않는다** — 그룹·항목·회차 칩이 전부 prop 이다. 열림 여부도 prop(`open`)이고
//   여는 쪽(#9 SiteGnb)이 상태를 갖는다. 시트가 스스로 열리지 않는다.
import { useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { navPrefetch } from './navPrefetch';
import { SessionChipStrip, type SessionChip } from './SessionChipStrip';
import { sheetKeyAction, shouldCloseOnOverlay } from './sheetKeys';
import './site.css';

export interface MenuItem {
  href: string;
  label: string;
}
export interface MenuGroup {
  title: string;
  items: MenuItem[];
  /**
   * 구획 끝에 붙는 **동작**(ADR-188 · 지휘부 결재 2026-09-03).
   *
   * ★ 전에는 시트에 로그아웃을 **일부러 안 넣었다** — *「폼 액션이라 링크 목록에 섞으면
   *   생김새는 같은데 하나만 다르게 동작한다」*(F-3 판정). **그 우려가 옳았고, 그래서 섞지 않는다** —
   *   링크 목록 **아래**에 구분선을 두고 **회색**으로 세워 «다른 것» 임을 보이게 한다.
   */
  action?: React.ReactNode;
}

/** 시트 안에서 초점을 받을 수 있는 것들. `disabled`·`tabindex=-1` 은 뺀다. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MenuSheet({
  open,
  onClose,
  name,
  role,
  cohort,
  groups,
  chips,
  signedIn = false,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  /** 이름 옆 작은 글씨 — `참여자`·`인도자` */
  role?: string;
  /** 기수 배지 — 없으면 그리지 않는다 */
  cohort?: string;
  groups: MenuGroup[];
  /** 회차 칩 스트립(발주 §3-7 — #8 을 품는다). 없으면 구획을 만들지 않는다. */
  chips?: SessionChip[];
  /**
   * 지금 보는 사람이 로그인했는가(ADR-176). **부품이 세션을 읽지 않는다** — 껍데기가 내려준다.
   * 미인증이면 보호 링크를 미리 받지 않는다(프록시가 되돌린 307 이 캐시에 남는다).
   */
  signedIn?: boolean;
}) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  /** 열기 전 초점을 기억했다가 닫을 때 되돌린다 — 돌아갈 자리를 잃지 않게. */
  const returnTo = useRef<HTMLElement | null>(null);

  const trap = useCallback(
    (e: KeyboardEvent) => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      const nodes = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE));
      const active = document.activeElement;
      // **판정은 순수 함수가 한다**(`sheetKeys.ts`) — 여기 남는 것은 DOM 배선뿐이다.
      const action = sheetKeyAction({
        key: e.key,
        shiftKey: e.shiftKey,
        atFirst: active === nodes[0],
        atLast: active === nodes[nodes.length - 1],
        inside: !!active && sheet.contains(active),
        hasFocusable: nodes.length > 0,
      });
      if (action === 'pass') return;
      e.preventDefault();
      if (action === 'close') onClose();
      else if (action === 'focus-first') nodes[0]?.focus();
      else nodes[nodes.length - 1]?.focus();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.addEventListener('keydown', trap, true);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden'; // 뒤 화면이 스크롤되면 시트가 떠 있는 뜻이 흐려진다
    return () => {
      document.removeEventListener('keydown', trap, true);
      document.body.style.overflow = overflow;
      returnTo.current?.focus?.();
    };
  }, [open, trap]);

  if (!open) return null;

  return (
    <div
      className="site-sheet__overlay"
      // 바깥 탭 닫힘 — 시트 자신에서 올라온 클릭은 무시한다.
      onMouseDown={(e) => { if (shouldCloseOnOverlay({ targetIsOverlay: e.target === e.currentTarget })) onClose(); }}
    >
      <div
        ref={sheetRef}
        className="site-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="전체 메뉴"
      >
        <div className="site-sheet__top">
          <button ref={closeRef} type="button" className="site-sheet__close" onClick={onClose} aria-label="메뉴 닫기">
            {/* 아이콘은 전부 인라인 SVG 다(발주 §5-3). 곱셈 기호 같은 **문자 기호도 쓰지 않는다** —
                기기·폰트마다 굵기와 크기가 달라지고 currentColor 로 통제되지 않는다.
                그 문자를 주석에조차 적지 않는다: 파일에 있으면 다음 사람이 복사한다. */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" aria-hidden focusable="false">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
          {cohort ? <span className="site-sheet__cohort">{cohort}</span> : null}
          <div className="site-sheet__name">
            {name}
            {role ? <small>{role}</small> : null}
          </div>
        </div>

        <div className="site-sheet__body">
          {chips && chips.length > 0 ? (
            <div className="site-sheet__chips">
              <div className="site-sheet__h">회차</div>
              {/* 잠긴 회차도 감추지 않는다 — 여정의 전체 길이가 보여야 한다(IA §3). */}
              <SessionChipStrip chips={chips} />
            </div>
          ) : null}

          {groups.map((g) => (
            <div className="site-sheet__group" key={g.title}>
              <div className="site-sheet__h">{g.title}</div>
              {g.items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className="site-sheet__item"
                  onClick={onClose}
                  // 따라갈 수 없는 링크는 미리 받아 두지 않는다(ADR-176).
                  prefetch={navPrefetch(it.href, signedIn)}
                >
                  {it.label}
                </Link>
              ))}
              {/* 동작은 링크 **아래**에 선다 — 위 규약대로 목록에 섞지 않는다. */}
              {g.action ? <div className="site-sheet__action">{g.action}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
