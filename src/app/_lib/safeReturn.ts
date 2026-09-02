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
  // 개인 응시(S-2). **라우트와 같은 커밋에서 올린다** — 없는 경로를 허용하면 returnTo 는 통과했는데
  //   목적지가 404 가 되고, 그것이 IA 원칙 2 가 막으려는 바로 그 상황이다.
  /^\/my\/values$/,
  // 체크 허브(S-3). 라우트와 같은 커밋이다 — proxy 가 이제 미인증 차단 시 경로를 returnTo 로
  //   싣기 때문에(`loginRedirectSearch`), 여기 없으면 로그인 뒤 /home 으로 흘러 딥링크가 끊긴다.
  /^\/home\/assessments$/,
  // 동행 피드(2차). **라우트와 같은 커밋이다**(발주 §8 마지막 줄). 미인증으로 /feed 에 닿으면
  //   proxy 가 `?returnTo=/feed` 를 붙이고, 여기 없으면 로그인 뒤 /home 으로 흘러 딥링크가 끊긴다.
  //   기수 전환 쿼리(`?cohort=`)는 proxy 가 애초에 싣지 않는다 — 로그인 뒤 기본 기수로 착지한다.
  /^\/feed$/,
  // ── 참여자 자기 화면(ADR-176 · 2026-09-02 실측으로 끊긴 것을 확인하고 이었다) ──────────
  //   프록시는 보호 경로 **전부**에 `?returnTo=` 를 싣는데(`loginRedirectSearch`)
  //   여기 없으면 조용히 버려져 로그인 뒤 **엉뚱한 화면**에 떨어진다.
  //   실측(라이브 · 미인증 딥링크 → 로그인): `/account` · `/my/cohorts` ·
  //   `/my/cohorts/{id}/journey` · `/my/cohorts/{id}/report` **넷 다 착지 실패**했다.
  //   («/my/cohorts/{id}» 는 「도착」처럼 보였는데 **그 사람의 착지가 마침 같은 주소**였을 뿐이다 —
  //    자가 속은 것이지 통과한 것이 아니다.)
  //   전부 **본인 것만 보이는 화면**이고 목적지 자체에 자격 게이트가 따로 있다.
  /^\/account$/,
  /^\/my\/cohorts$/,
  /^\/my\/cohorts\/[0-9a-fA-F-]{36}$/,
  /^\/my\/cohorts\/[0-9a-fA-F-]{36}\/journey$/,
  /^\/my\/cohorts\/[0-9a-fA-F-]{36}\/report$/,
  // ★ **일부러 뺀 것 — `/coach/**` · `/admin/**` · `/preview/**`.**
  //   막혀서가 아니라 **정책이라서** 뺐다. 권한 화면으로 보내는 링크를 누가 만들 수 있는가는
  //   보안 판단이고 그것은 지휘부 결재다. 지금은 그 셋만 로그인 뒤 착지 규칙(ADR-173)으로 간다.
  //   결재가 나면 여기 한 줄씩 더한다 — 잠금이 「뺀 것도 일부러 뺐다」를 함께 잰다.
];

export function safeReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // 절대 URL·스킴·프로토콜상대(//)·백슬래시(\\) 차단. 정규식이 앞을 '/'(단일)로 고정하므로 이중 방어.
  if (raw.startsWith('//') || raw.startsWith('\\') || raw.includes('://')) return null;
  if (!SAFE_RETURN.some((re) => re.test(raw))) return null;
  return raw;
}
