// 부품 1 · SiteHero — 시안 P1 `.hero`·A (4차 F-1 · 발주 §3-1).
//
// **부품은 계산하지 않는다**(지휘부 강조 ①) — 문안·CTA 가 전부 prop 이다. 데이터 접근 0.
// **문안은 슬롯이다** — 시안 문구는 화면(page) 층이 넣는다. 문안 확정은 F-2 몫(발주 §2).
// 색은 §1.1 정본 팔레트 — 면은 `--color-surface-inverse`(그라디언트 150deg), 강조어는
//   `--color-accent-strong`. **시안 색값 이관 0.**
import Link from 'next/link';
import './site.css';

export interface SiteHeroCta {
  href: string;
  label: string;
  /** primary = 골드 면 · ghost = 테두리. 판정이 아니라 지정이다. */
  tone: 'primary' | 'ghost';
}

export function SiteHero({
  eyebrow,
  headline,
  lead,
  ctas = [],
  aside,
}: {
  eyebrow?: string;
  /** 강조는 `<b>` 슬롯으로 받는다 — 부품이 문장을 쪼개지 않는다. */
  headline: React.ReactNode;
  lead?: React.ReactNode;
  ctas?: SiteHeroCta[];
  /** PC 2단의 우측 칸(사진·카드 등). 없으면 1단으로 흐른다. */
  aside?: React.ReactNode;
}) {
  return (
    <section className="site-hero">
      <div className="site-hero__in">
        <div>
          {eyebrow ? <div className="site-hero__eyebrow">{eyebrow}</div> : null}
          <h1 className="site-hero__h1">{headline}</h1>
          {lead ? <p className="site-hero__lead">{lead}</p> : null}
          {ctas.length > 0 ? (
            <div className="site-hero__cta">
              {ctas.map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  className={`ui-btn ${c.tone === 'primary' ? 'ui-btn--primary' : 'ui-btn--ghost'}`}
                  style={
                    c.tone === 'primary'
                      ? { background: 'var(--color-accent)', color: 'var(--color-text-on-gold)', textDecoration: 'none' }
                      : { color: 'var(--color-text-on-accent)', borderColor: 'var(--navy-500)', textDecoration: 'none' }
                  }
                >
                  {c.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        {aside ? <div>{aside}</div> : null}
      </div>
    </section>
  );
}
