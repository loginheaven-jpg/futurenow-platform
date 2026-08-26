// 오픈 리다이렉트 방어(ADR-81 · 클코1 B3). returnTo 는 자유 문자열이 아니라 화이트리스트 통과 상대 경로만 취급한다.
// reset/ResetRequestClient 의 "사용자 입력으로 만들지 않는다" 입장 연장 — 검증 실패는 조용히 null(호출부가 /home 등으로 폴백).
// 허용: 갈무리 QR 짧은 경로(/c/{code}/{n})와 갈무리 카드(/my/cohorts/{uuid}/checkin/{n}),
//   그리고 가치 카드의 같은 두 형태(/c/{code}/values · /my/cohorts/{uuid}/values).
// 가치 카드에서 실제로 왕복이 도는 것은 **짧은 경로 쪽**이다(v3 §10-b) — 그 페이지가 스스로
//   `/login?returnTo=` 를 붙이기 때문이다. `/my/…` 형태는 proxy 가 미인증을 걸 때 search 를 비우므로
//   지금은 발화하지 않지만, 목적지가 같은 화면이라 짝을 맞춰 둔다(한쪽만 있으면 나중에 반드시 어긋난다).
const SAFE_RETURN: RegExp[] = [
  /^\/c\/[A-Za-z0-9]{4,8}\/[1-9][0-9]?$/,
  /^\/my\/cohorts\/[0-9a-fA-F-]{36}\/checkin\/[1-9][0-9]?$/,
  /^\/c\/[A-Za-z0-9]{4,8}\/values$/,
  /^\/my\/cohorts\/[0-9a-fA-F-]{36}\/values$/,
];

export function safeReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // 절대 URL·스킴·프로토콜상대(//)·백슬래시(\\) 차단. 정규식이 앞을 '/'(단일)로 고정하므로 이중 방어.
  if (raw.startsWith('//') || raw.startsWith('\\') || raw.includes('://')) return null;
  if (!SAFE_RETURN.some((re) => re.test(raw))) return null;
  return raw;
}
