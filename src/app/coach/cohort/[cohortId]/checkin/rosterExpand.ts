// 인도자 명단 — 행을 펼칠 수 있는가(ADR-86 · ADR-91 B4 · ADR-197).
//
// 서버 페이지가 부르는 순수 함수다. `RosterDetail` 은 'use client' 모듈이라 거기 두면 서버가 부를 수 없다.
//
// **내용이 있을 때만 펼친다**(ADR-91 B4) — 복귀 안내가 빈 행을 만들 수 있어 행 존재만으로 펼치면
//   배너만 본 '미작성' 참여자에게 빈 화살표가 생긴다.
// **사진도 내용이다**(ADR-197) — 세미나 중에 워크북만 찍어 올리고 아직 한 줄도 안 쓴 사람이 바로 이 기능의
//   중심 사례인데, 글 기준으로만 재면 인도자가 그 사진을 볼 길이 없었다(배포 후 실화면에서 잡혔다).
// **부채널이 아니다** — `photoCount` 는 인도자에게 **보이는** 사진 수다. 참여자가 「인도자 열람」을 풀면
//   목록이 비어 오므로 「올리지 않았다」와 「가렸다」가 이 판정에서 갈리지 않는다.
export function rosterExpandable(
  checkin: { hasContent: boolean; submittedAt: string | null } | null | undefined,
  photoCount: number,
): boolean {
  if (!checkin) return false;
  return checkin.hasContent || checkin.submittedAt != null || photoCount > 0;
}
