// 미리 받아 둘 것인가 — **한 곳에서 정한다**(ADR-176 · 불변식 23).
//
// 같은 링크를 그리는 자리가 셋이다(벨트 `SiteGnb` · 시트 `MenuSheet` · 푸터 `SiteFooter`).
//   ADR-176 첫 판에서 **벨트만 고쳤더니 배포 뒤에도 헛 프리페치가 그대로 나갔다** —
//   푸터가 같은 「진단」을 그리고 있었다. **사본이 셋이면 규칙을 하나로 뗀다.**
//
// **왜 막는가**: 미인증으로 보호 화면을 프리페치하면 프록시가 로그인으로 되돌리고
//   그 307 이 라우터 캐시에 남아 **로그인 뒤 재사용된다**(ADR-175 가 그 결함이다).
//   따라갈 수 없는 링크를 미리 받는 것은 **버려지는 데서 끝나지 않는다.**
//
// 보호 판정은 프록시와 **같은 함수**를 쓴다 — 접두사 목록을 베끼지 않는다.
import { isProtectedPath } from '@/proxy.guard';

/**
 * `<Link prefetch>` 에 넘길 값. `undefined` 는 「Next 기본대로」이고 `false` 는 「받지 마라」다.
 *
 * 로그인했으면 막지 않는다 — 그 사람은 실제로 갈 수 있고 프리페치가 값을 낸다.
 * **모르면 안 받아 둔다** — 안전한 쪽이 기본이다.
 */
export function navPrefetch(href: string, signedIn: boolean): false | undefined {
  return signedIn || !isProtectedPath(href) ? undefined : false;
}
