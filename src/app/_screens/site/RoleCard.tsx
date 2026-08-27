// 부품 5 · RoleCard(site) — 시안 B `.role-card` (4차 F-1 · 발주 §3-5).
//
// **기존 `_screens/RoleCard.tsx` 를 건드리지 않는다**(발주 §3-5·§5-2). 교체는 F-3 이고
//   지금은 `site/` 안에 신규로 선다. 이름을 `SiteRoleCard` 로 둔 것은 두 부품이 한 화면에
//   함께 import 될 때 어느 쪽인지 읽는 사람이 바로 알게 하기 위해서다.
//
// **부품은 계산하지 않는다** — 역할 판정·목적지 결정은 화면(page) 층의 일이고 여기는 슬롯이다.
// 우상단 골드 방사 원은 시안 그대로(알파 .28)이고 색은 토큰이다 — **색값 이관 0**.
import Link from 'next/link';
import './site.css';

export function SiteRoleCard({
  badge,
  who,
  title,
  sub,
  cta,
}: {
  /** 소속 배지(골드 테두리 pill) — `예봄 2기` 등. 없으면 그리지 않는다. */
  badge?: string;
  /** 누구인지 한 줄 — `인도자 · 예봄 1·2기` */
  who?: React.ReactNode;
  title: string;
  sub?: string;
  cta?: { href: string; label: string };
}) {
  const body = (
    <>
      {badge ? <span className="site-role__badge">{badge}</span> : null}
      {who ? <div className="site-role__who">{who}</div> : null}
      <h3 className="site-role__title">{title}</h3>
      {sub ? <div className="site-role__sub">{sub}</div> : null}
      {cta ? (
        <div className="site-role__cta">
          <span className="ui-btn ui-btn--primary"
                style={{ background: 'var(--color-accent)', color: 'var(--color-text-on-gold)' }}>
            {cta.label}
          </span>
        </div>
      ) : null}
    </>
  );
  // CTA 가 있으면 카드 전체가 링크다 — 탭 대상이 넓을수록 폰에서 정확하다.
  return cta ? <Link href={cta.href} className="site-role">{body}</Link> : <div className="site-role">{body}</div>;
}
