'use client';
// 콘솔 셸 — 사이드바(lg 이상) / 상단 탭(미만) (3차 T-4 · design_system §3.1·§9.4).
//
// **참여자 화면에는 들어가지 않는다.** `/coach`·`/admin` 레이아웃에서만 감싼다(발주 §5).
//
// 시안 P2 의 구조를 따른다 — 네이비-900 면, 현재 항목은 골드. 다만 **색만으로 말하지 않는다**
//   (design_system §10 v4) — 현재 항목은 `aria-current="page"` 와 **왼쪽 굵은 띠**를 함께 갖는다.
//   §1.6 이 실측한 대로, 색 하나에 기대면 그 색이 배경과 같아지는 날 조용히 사라진다.
//
// **인쇄에서 사라진다.** 리포트 인쇄(ADR-69)에 내비가 끼면 문서가 아니다.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { consoleNav, isCurrent, type ConsoleNavGroup } from './consoleNav';

export function ConsoleShell({
  role,
  children,
}: {
  role: 'user' | 'coach' | 'admin';
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const groups = consoleNav({ role, pathname });
  if (groups.length === 0) return <>{children}</>; // 참여자 — 셸 없이 그대로

  return (
    <div className="console-shell">
      <nav className="console-nav" aria-label="콘솔 메뉴">
        {groups.map((g, i) => (
          <Group key={g.title ?? `g${i}`} group={g} pathname={pathname} groups={groups} />
        ))}
      </nav>
      <div className="console-main">{children}</div>
    </div>
  );
}

function Group({ group, pathname, groups }: { group: ConsoleNavGroup; pathname: string; groups: ConsoleNavGroup[] }) {
  return (
    <div className="console-navgroup">
      {group.title ? <div className="console-navtitle">{group.title}</div> : null}
      {group.items.map((it) => {
        const on = isCurrent(it, pathname, groups);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={on ? 'page' : undefined}
            className={`console-navlink${on ? ' is-current' : ''}`}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
