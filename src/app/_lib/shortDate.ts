// 소식 줄의 짧은 날짜(`8.20`) — **화면(page) 층의 일이다**(4차 F-2).
//
// 부품 안에 두지 않는 이유: `NewsRow` 가 날짜를 만들면 그 안에서 `new Date` 를 부르게 되고,
//   서버와 브라우저의 시간대가 갈리는 자리가 생긴다. 부품 순수성 테스트가 그 호출 자체를 막는다.
//   **부품은 이미 만들어진 문자열을 받는다.**
//
// KST 고정 — 이 서비스의 하루 경계는 한국이다(피드 날짜 구분선과 같은 기준).

/** ISO 문자열을 `M.D` 로. 값이 이상하면 **빈 문자열**을 돌려 그 자리를 그리지 않게 한다. */
export function shortDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const kst = new Date(t + 9 * 60 * 60 * 1000);
  return `${kst.getUTCMonth() + 1}.${kst.getUTCDate()}`;
}
