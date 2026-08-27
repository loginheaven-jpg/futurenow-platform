// 부품 6 · QuickTiles — 시안 B `.quick-grid` (4차 F-1 · 발주 §3-6).
//
// 2×2 그리드. **이모지 금지 — 인라인 SVG 스트로크**(발주 §5-3). 시안은 타일마다 이모지를
//   썼으나 이모지는 기기마다 다른 그림이 나오고 색을 제어할 수 없다. 스트로크 아이콘은
//   `currentColor` 를 따라가므로 토큰 하나로 통제된다.
//   **그 이모지들을 주석에조차 적지 않는다** — 파일에 있으면 다음 사람이 복사한다.
// **부품은 계산하지 않는다** — 타일 목록이 전부 prop 이다.
import Link from 'next/link';
import './site.css';

/** 스트로크 아이콘 — `currentColor` 를 따른다. 이름은 뜻이지 그림이 아니다. */
export type QuickIcon = 'checkin' | 'mirror' | 'feed' | 'library';

const PATHS: Record<QuickIcon, React.ReactNode> = {
  checkin: <><path d="M4 4h16v16H4z" /><path d="M8 10h8M8 14h5" /></>,
  mirror: <><circle cx="12" cy="12" r="8" /><path d="M12 8v8" /></>,
  feed: <><path d="M4 6h16M4 12h16M4 18h10" /></>,
  library: <><path d="M4 5h6v14H4zM14 5h6v14h-6z" /></>,
};

function Icon({ name }: { name: QuickIcon }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      {PATHS[name]}
    </svg>
  );
}

export interface QuickTile {
  icon: QuickIcon;
  title: string;
  /** 어디로 가는지 한 줄(선택) */
  hint?: string;
  href: string;
}

export function QuickTiles({ tiles }: { tiles: QuickTile[] }) {
  return (
    <div className="site-quick">
      {tiles.map((t) => (
        <Link key={t.href} href={t.href} className="site-quick__tile ui-tappable">
          <span style={{ color: 'var(--color-primary)' }}><Icon name={t.icon} /></span>
          <span className="site-quick__t">{t.title}</span>
          {t.hint ? <span className="site-quick__s">{t.hint}</span> : null}
        </Link>
      ))}
    </div>
  );
}
