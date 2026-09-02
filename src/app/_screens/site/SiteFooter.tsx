// 부품 13 · SiteFooter — 시안 P1 `.foot` · A `.pub-foot` (4차 F-2).
//
// 시안은 둘로 보이지만 하나다 — P1 은 좌 소속 + 우 링크 줄이고, A(폰)는 소속 한 줄이다.
//   **링크가 없으면 그 줄을 그리지 않으므로** 같은 부품이 둘을 다 덮는다.
//
// **링크는 화면이 준다.** 부품이 `이용약관`·`개인정보처리방침` 을 박아 두면,
//   그 페이지가 아직 없는데도 자리가 생기고 **눌리는데 아무 일도 없는 링크**가 남는다.
//   무엇이 있는지는 화면만 안다(F-2 시점에 그 둘은 아직 없다 — 완주 보고 §부재).
import Link from 'next/link';
import { navPrefetch } from './navPrefetch';
import './site.css';

export function SiteFooter({
  org,
  links = [],
  note,
  signedIn = false,
}: {
  /** 소속 한 줄(`퓨처나우 · 청계로벤하임`) */
  org: React.ReactNode;
  links?: { href: string; label: string }[];
  /**
   * 지금 보는 사람이 로그인했는가(ADR-176). **부품이 세션을 읽지 않는다** — 껍데기가 내려준다.
   * 미인증이면 보호 링크를 미리 받지 않는다. 기본값이 `false` 라 **모르면 안 받아 둔다.**
   */
  signedIn?: boolean;
  /** 소속 아래 보조 문장. 없으면 그리지 않는다 */
  note?: React.ReactNode;
}) {
  return (
    <footer className="site-foot">
      <div className="site-foot__in">
        <div>
          <div className="site-foot__org">{org}</div>
          {note ? <div className="site-foot__note">{note}</div> : null}
        </div>
        {links.length > 0 ? (
          <nav className="site-foot__nav" aria-label="이용 안내">
            {links.map((l) => (
              <Link key={l.href} href={l.href} prefetch={navPrefetch(l.href, signedIn)}>
                {l.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </footer>
  );
}
