// 부품 3 · CardBand3 — 시안 P1 `.three` (4차 F-1 · 발주 §3-3).
//
// lg↑ 3열 · 그 아래 1열. `pc-cards` 계열 확장이나 **간격이 시안 값(22)** 이라 전용 클래스를 둔다.
// **부품은 계산하지 않는다** — 카드 셋이 전부 prop 이다.
import './site.css';

export interface BandCard {
  kicker?: string;
  title: string;
  body: React.ReactNode;
}

export function CardBand3({ cards }: { cards: BandCard[] }) {
  return (
    <div className="site-band">
      {cards.map((c) => (
        <article className="ui-card" key={c.title}>
          {c.kicker ? <div className="site-band__kicker">{c.kicker}</div> : null}
          <h3 className="site-band__title">{c.title}</h3>
          <div className="site-band__body">{c.body}</div>
        </article>
      ))}
    </div>
  );
}
