// 부품 14 · LeaderCard — 발주 `site_v2_4_F2b` §3 (시안 없는 화면의 사양 승인).
//
// **번호를 14 로 단다.** 발주 §3 표는 `10`·`11` 로 적었으나 §9.7 에는 이미 #10 `SectionTitle` ·
//   #11 `NewsRow` 가 있다. 발주가 *"§9.7 +2행"* 이라 했으므로 **이어 붙이는 것**이 뜻이고,
//   번호를 재사용하면 옛 참조가 미아가 된다(불변식 12.1). 사양은 발주 그대로다.
//
// **두 사람 대등**(발주 §1-4) — 같은 부품·같은 슬롯 구성이다. 한쪽만 크게 만들 자리가 없다.
// **부품은 계산하지 않는다** — 사진이 있는지, 얼마나 키울 수 있는지도 전부 prop 이다.
import './site.css';

export interface LeaderCardPhoto {
  /** `public/leaders/` 아래 파일명. **없으면 이니셜 자리표시자가 선다**(원고 §6.2 — 3종 공란). */
  src?: string;
  alt: string;
  /**
   * 확대 상한(px). 원고 §5.2 가 최철영 전달본을 329×427 로 적고 *"그 이상 확대 금지"* 라 했다.
   * **주석이 아니라 코드로 막는다**(발주 §2) — 주석은 다음 사람이 안 읽는다.
   */
  maxSize?: number;
}

export function LeaderCard({
  name,
  title,
  tagline,
  bio,
  intro,
  photo,
}: {
  name: string;
  title: string;
  tagline?: string;
  /** 약력 5행(원고 §1.2·§2.2). 없으면 그 목록을 그리지 않는다. */
  bio?: string[];
  intro: string;
  photo: LeaderCardPhoto;
}) {
  // 자리표시자는 **이름 첫 글자**다. 회색 상자만 두면 무엇이 빠졌는지 안 보인다.
  const initial = name.slice(0, 1);
  return (
    <article className="site-leader">
      <div className="site-leader__top">
        <div
          className="site-leader__photo"
          // 원본이 작은 컷은 여기서 막힌다. `maxSize` 가 없으면 규격(§5.0)대로 자란다.
          style={photo.maxSize ? { maxWidth: photo.maxSize, maxHeight: photo.maxSize } : undefined}
        >
          {photo.src ? (
            <picture>
              {/* 원고 §5.4 — WebP 를 함께 내보내고 폴백을 건다. 첫 화면 밖이라 지연 로딩. */}
              <source srcSet={photo.src.replace(/\.(jpg|png)$/, '.webp')} type="image/webp" />
              <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
            </picture>
          ) : (
            // 자리표시자에도 이름을 남긴다 — 스크린리더가 빈 상자를 읽지 않게.
            <span className="site-leader__ph" role="img" aria-label={`${photo.alt} (사진 준비 중)`}>
              {initial}
            </span>
          )}
        </div>
        <div className="site-leader__who">
          <h3 className="site-leader__name">{name}</h3>
          <div className="site-leader__title">{title}</div>
          {tagline ? <p className="site-leader__tag">{tagline}</p> : null}
        </div>
      </div>

      {bio && bio.length > 0 ? (
        <ul className="site-leader__bio">
          {bio.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}

      <p className="site-leader__intro">{intro}</p>
    </article>
  );
}
