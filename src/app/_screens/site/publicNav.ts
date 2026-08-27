// 공개 영역 내비 정본 (4차 F-2).
//
// **한 곳에 둔다.** `/` 와 `/about` 이 같은 GNB·푸터를 쓰는데 각자 배열을 들면
//   메뉴 하나가 늘 때 두 곳이 어긋난다(불변식 23 — 사본이 둘이면 잠금으로 묶는다).
//   화면이 늘어날수록 이 파일 하나만 자란다.
//
// 부품이 아니라 **설정**이다 — 링크 목록일 뿐 렌더도 판정도 하지 않는다.

export interface PublicNavItem {
  href: string;
  label: string;
}

/**
 * 시안 P1 `.gnb` 의 여섯. 순서까지 시안 그대로다.
 *
 * `진단` 은 **로그인 뒤 화면**을 가리킨다(`/home/assessments`). 미인증 방문자가 누르면
 * 미들웨어가 `/login?returnTo=…` 로 보낸다 — 시안 D(딥링크 게이트)가 설계한 그 경로이고,
 * 여기서 막아 두면 이미 참여 중인 사람이 현관에서 진단으로 갈 길이 없어진다.
 * **다만 시안이 이 목적지를 지정한 적은 없다** → 완주 보고 질의 항목.
 */
export const PUBLIC_NAV: PublicNavItem[] = [
  { href: '/about', label: '소개' },
  { href: '/recruit', label: '참여 신청' },
  { href: '/home/assessments', label: '진단' },
  { href: '/library', label: '자료실' },
  { href: '/news', label: '소식' },
  { href: '/contact', label: '문의' },
];

/** 시안 P1 `.foot` 는 좌 소속 + 우 링크 줄이다. */
export const SITE_ORG = '퓨처나우 · 청계로벤하임';

/**
 * 푸터 링크 줄 — **폰에서 이것이 메뉴다.**
 *
 * §9.6 이 *"공개 현관은 평문 링크로 확정한다"* 로 못 박았고(3차 판정 A), 시안 A 의 아이콘
 * 탭바는 **불채택**이다. 그러면 md↓ 에서 GNB 메뉴가 접힌 뒤 갈 길이 남아야 하는데,
 * F-2 390px 캡처에서 **아무 길도 없었다** — 로고와 로그인뿐이었다.
 * 그래서 푸터가 그 줄을 든다. 탭바를 만들지 않고도 여섯 곳에 다 닿는다.
 *
 * **`이용약관`·`개인정보처리방침` 은 없다** — 시안 P1 `.foot` 에는 있으나 라우트가 아직 없다.
 * 눌리는데 아무 일도 없는 링크가 가장 나쁘다. 페이지가 생기면 여기 두 줄을 더한다.
 */
export const PUBLIC_FOOTER_LINKS: PublicNavItem[] = [...PUBLIC_NAV];
