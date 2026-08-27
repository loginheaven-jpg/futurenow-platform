// 부품 11 · NewsRow — 시안 P1 `.news-row .news` · A `.notice .card` (4차 F-2).
//
// **부품은 계산하지 않는다**(강조 ①) — 날짜는 **이미 만들어진 문자열**로 받는다.
//   `new Date(...)` 를 여기서 부르면 서버와 브라우저의 시간대가 갈리고, 순수성 테스트가
//   그 호출 자체를 막는다. 포맷은 화면(page) 층이 한다.
//
// 배지도 판정이 아니라 지정이다 — *"이 줄이 모집이다"* 를 부품이 정하지 않는다.
import Link from 'next/link';
import './site.css';

export interface NewsRowItem {
  /** 목록 키. 링크가 없는 줄도 있으므로 href 와 분리한다. */
  id: string;
  title: React.ReactNode;
  /** 이미 사람이 읽을 꼴로 만든 날짜(`8.20`). 부품은 날짜를 만들지 않는다. */
  date?: string;
  /** `모집` 같은 표지. **없으면 그리지 않는다** */
  badge?: string;
  href?: string;
}

export function NewsRow({ items }: { items: NewsRowItem[] }) {
  if (items.length === 0) return null; // 빈 목록에 빈 상자를 남기지 않는다
  return (
    <ul className="site-news">
      {items.map((n) => {
        const inner = (
          <>
            <span className="site-news__l">
              {n.badge ? <span className="site-news__badge">{n.badge}</span> : null}
              <span className="site-news__t">{n.title}</span>
            </span>
            {n.date ? <span className="site-news__d">{n.date}</span> : null}
          </>
        );
        return (
          <li key={n.id} className="site-news__row">
            {n.href ? (
              <Link href={n.href} className="site-news__link">
                {inner}
              </Link>
            ) : (
              // 갈 곳이 없으면 링크로 만들지 않는다 — 눌리는데 아무 일도 없는 것이 가장 나쁘다.
              <span className="site-news__link">{inner}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
