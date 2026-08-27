// 부품 12 · RecruitCard — 시안 P1 `.recruit` (4차 F-2).
//
// 소식 줄 옆에 서는 모집 안내 띠. 키커(`NEXT COHORT`) · 제목 · 본문 · CTA 1.
// **면은 `--color-surface-2`** 다 — 소식 목록과 나란히 서면서도 구별돼야 하는데,
//   여기서 골드 면을 쓰면 히어로·CTA 와 강조가 경쟁한다. 골드는 **키커와 버튼에만** 둔다.
//
// **부품은 계산하지 않는다** — 모집이 열렸는지 닫혔는지 판정하지 않는다.
//   닫힌 기수에 `알림 신청` 을 띄울지는 화면이 정하고, 부품은 받은 것을 그린다.
import Link from 'next/link';
import './site.css';

export function RecruitCard({
  kicker,
  title,
  body,
  cta,
}: {
  kicker?: string;
  /** 줄바꿈은 `<br>` 슬롯으로 — 부품이 문장을 쪼개지 않는다. */
  title: React.ReactNode;
  body?: React.ReactNode;
  cta?: { href: string; label: string };
}) {
  return (
    <aside className="site-recruit">
      {kicker ? <div className="site-recruit__k">{kicker}</div> : null}
      <h3 className="site-recruit__t">{title}</h3>
      {body ? <p className="site-recruit__b">{body}</p> : null}
      {cta ? (
        <Link
          href={cta.href}
          className="ui-btn ui-btn--primary site-recruit__cta"
          style={{ background: 'var(--color-accent)', color: 'var(--color-text-on-gold)', textDecoration: 'none' }}
        >
          {cta.label}
        </Link>
      ) : null}
    </aside>
  );
}
