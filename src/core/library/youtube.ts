// 유튜브 주소 판별 — **규칙이 사는 자리는 여기 하나다**(불변식 23).
//
// 세 곳이 같은 규칙을 필요로 한다: 제목 자동 입력(서버 액션) · 썸네일 프록시(라우트) ·
//   얼굴판(화면). 규칙을 세 번 적으면 **한 곳만 고쳐지는 날**이 오고,
//   그때 「제목은 받았는데 썸네일은 안 뜬다」가 조용히 난다.
//
// ★ **주소를 밖으로 내지 않는다.** 이 파일은 id 만 뽑고, 그 id 로 무엇을 부를지는
//   **서버 쪽 두 자리**(액션 · 프록시)에서만 쓴다. 화면은 id 조차 받지 않고
//   `/library/{id}/thumb` 라는 **우리 주소**만 조립한다 — 서가 §4 가 그대로 산다.
//
// ★ **설계서 §4.1 이 정한 것을 그대로 옮겼다**(`docs/tasks/퓨처나우_서가_설계서_v1.md`):
//   *「유튜브는 id 만 뽑아 저장한다(`v=` · `youtu.be/` · `/shorts/`).
//     원본 주소를 그대로 두면 재생목록·타임스탬프·추적 파라미터가 붙어 다닌다」*
//   저장은 이번 회차 범위 밖이라(표를 넓히지 않는다) **읽을 때마다 뽑는다** —
//   같은 규칙이므로 나중에 저장으로 옮겨도 값이 갈리지 않는다.

/**
 * 유튜브 호스트 — **완전 일치만**.
 *
 * ★ 이 목록은 **SSRF 방어**다. 사용자가 친 문자열로 서버가 밖으로 나가므로,
 *   `youtube.com.evil.test` 같은 것이 부분일치로 통과하면 안 된다.
 *   그래서 `includes` 가 아니라 `URL.hostname` **완전 일치**로 본다.
 */
const HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

/** 영상 id 의 모양. 유튜브가 쓰는 11자다. */
const ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * 주소에서 **영상 id 만** 뽑는다. 유튜브가 아니거나 못 뽑으면 `null`.
 *
 * **문자열을 정규식으로 훑지 않고 `URL` 로 파싱한다** — 훑으면
 * `https://evil.test/?u=youtube.com/watch?v=xxxxxxxxxxx` 같은 것이 통과한다.
 * 파싱하면 호스트가 무엇인지 **추측이 아니라 값으로** 나온다.
 */
export function youtubeId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null; // 주소가 아니면 유튜브도 아니다
  }
  // http 도 받지만 우리가 나갈 때는 https 로 다시 조립한다(아래 두 함수).
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (!HOSTS.has(u.hostname)) return null;

  const seg = u.pathname.split('/').filter(Boolean);
  const cand =
    u.hostname.endsWith('youtu.be') ? seg[0]                       // youtu.be/<id>
    : seg[0] === 'watch' ? u.searchParams.get('v')                 // /watch?v=<id>
    : seg[0] === 'shorts' || seg[0] === 'embed' || seg[0] === 'live' ? seg[1]
    : null;

  return cand && ID.test(cand) ? cand : null;
}

/**
 * oEmbed 창구 — **우리가 조립한다.** 사용자가 친 주소를 그대로 넘기지 않는다.
 *   id 만 뽑아 정규 주소를 다시 만들므로, 통과한 뒤에는 사용자 문자열이 남지 않는다.
 */
export function youtubeOembedUrl(id: string): string {
  return `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${id}`,
  )}&format=json`;
}

/**
 * 썸네일 원본 — **서버만 부른다.** 이 주소가 브라우저로 가면
 *   설계서 §4.2 의 *「누르기 전에는 유튜브에 요청이 한 번도 가지 않는다」* 가 깨진다.
 *   그래서 `/library/[id]/thumb` 프록시가 이것을 받아 **바이트로** 흘린다.
 *
 * `hqdefault` 는 **모든 영상에 존재한다**(maxres 는 없는 영상이 있어 404 가 난다).
 */
export function youtubeThumbUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/**
 * 재생 주소 — **`youtube-nocookie.com`**(설계서 §4.2).
 *   누른 **뒤에만** 쓰이므로 그 시점에 유튜브로 나가는 것은 사용자가 고른 일이다.
 */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
}

/** 새 창으로 보낼 때(설계서 §4.2 — 사내망·확장프로그램이 iframe 을 막는 경우가 있다). */
export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}
