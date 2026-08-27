// 부품 15 · BookPanel — 발주 `site_v2_4_F2b` §3 (시안 없는 화면의 사양 승인).
//
// 번호 사유는 `LeaderCard.tsx` 머리와 같다(§9.7 에 이어 붙인다).
//
// **구매 버튼은 ghost 다.** 원고 §3.4 가 *"primary 골드 버튼은 세미나 신청 CTA 전용이므로
//   겹치지 않게 한다"* 로 위계를 못 박았다 — F-1 `SiteHero` 의 두 톤과 같은 규칙이다.
//   **책을 파는 화면이 아니라 세미나로 부르는 화면**이고, 골드가 둘이면 어디로 가야 할지 흐려진다.
//
// **표지 자리표시자는 3D 목업이 아니다**(원고 §5.3 — *"정면 평면 이미지 + 얇은 그림자"*).
import Link from 'next/link';
import './site.css';

export interface BookFact {
  k: string;
  v: string;
}

export function BookPanel({
  cover,
  facts,
  intro,
  buy,
  notice,
  bulk,
}: {
  /** 표지. **없으면 자리표시자**(원고 §6.2 — 출판사 원본 대기). */
  cover?: { src?: string; alt: string };
  facts: BookFact[];
  /** 소개문 단락들. **합치지 않는다** — 단락이 곧 호흡이다(원고 §3.2 는 셋). */
  intro: string[];
  /** 외부 구매처. `target=_blank` + `rel=noopener noreferrer`(원고 §3.4). */
  buy?: { href: string; label: string };
  /** 필수 고지 — 참여자 대면이라 존대체다. */
  notice?: React.ReactNode;
  /** 단체 구매 — 링크가 아니라 문의로 받는다. */
  bulk?: { text: string; href: string };
}) {
  return (
    <div className="site-book">
      {/* `cover` 자체가 없으면 칸을 만들지 않는다 — 다른 부품과 같은 규칙이다.
          `src` 만 없으면 **자리표시자가 선다**(원고 §6.2 — 표지 원본 대기). */}
      {cover ? (
      <div className="site-book__coverwrap">
        <div className="site-book__cover">
          {cover.src ? (
            <picture>
              <source srcSet={cover.src.replace(/\.(jpg|png)$/, '.webp')} type="image/webp" />
              <img src={cover.src} alt={cover.alt} loading="lazy" decoding="async" />
            </picture>
          ) : (
            <span className="site-book__ph" role="img" aria-label={`${cover.alt} (이미지 준비 중)`}>
              FUTURE
              <br />
              NOW
            </span>
          )}
        </div>
      </div>
      ) : null}

      <div className="site-book__body">
        <dl className="site-book__facts">
          {facts.map((f) => (
            <div className="site-book__fact" key={f.k}>
              <dt>{f.k}</dt>
              <dd>{f.v}</dd>
            </div>
          ))}
        </dl>

        {intro.map((p) => (
          <p className="site-book__p" key={p.slice(0, 24)}>
            {p}
          </p>
        ))}

        {buy ? (
          <a
            className="ui-btn ui-btn--ghost site-book__buy"
            href={buy.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {buy.label}
          </a>
        ) : null}

        {notice ? <p className="site-book__notice">{notice}</p> : null}
        {bulk ? (
          <p className="site-book__bulk">
            <Link href={bulk.href}>{bulk.text}</Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
