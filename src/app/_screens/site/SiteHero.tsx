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
  features,
}: {
  eyebrow?: string;
  /** 강조는 `<b>` 슬롯으로 받는다 — 부품이 문장을 쪼개지 않는다. */
  headline: React.ReactNode;
  lead?: React.ReactNode;
  ctas?: SiteHeroCta[];
  /** PC 2단의 우측 칸(사진·카드 등). 없으면 1단으로 흐른다. */
  aside?: React.ReactNode;
  /**
   * 헤드라인 아래 **짧은 사실 셋**(ADR-171 · design_system §9.7 #1 개정분).
   *
   * ★ **없으면 그리지 않는다** — 그 부품의 금지 조항이 「빈 슬롯을 자리로 남기지 않는다」이고
   *   `/about` 히어로는 이것을 안 준다. 자리만 비워 두면 그 여백이 결손으로 읽힌다.
   */
  features?: React.ReactNode;
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
                  // **어두운 면 갈래를 쓴다**(ADR-171). 인라인 style 로 색을 덮던 것을 걷었다 —
                  //   같은 색이 부품과 화면 두 곳에 있으면 한쪽만 고쳐진다(불변식 23).
                  //   `--color-text-on-gold` 는 이제 `ui.css` 의 `--on-dark` 가 든다.
                  className={`ui-btn ${c.tone === 'primary' ? 'ui-btn--on-dark' : 'ui-btn--on-dark-ghost'}`}
                  style={{ textDecoration: 'none' }}
                >
                  {c.label}
                  <span className="ui-btn__arrow" aria-hidden="true">›</span>
                </Link>
              ))}
            </div>
          ) : null}
          {features ? <div className="site-hero__features">{features}</div> : null}
        </div>
        {aside ? <div>{aside}</div> : null}
      </div>
    </section>
  );
}
