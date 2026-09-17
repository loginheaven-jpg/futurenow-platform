// 갈무리 사진 경로 규약(ADR-83 · ADR-197) — **한 곳에만 둔다.**
//
// 올리는 쪽(참여자 카드 · 브라우저)과 읽고 지우는 쪽(코어 · 서버)이 같은 이름을 만들어야 한다.
//   둘이 각자 문자열을 조립하면 한쪽만 바뀌는 날 미리보기가 원본으로 읽히거나 안 지워진다(불변식 23).
//
// 규약: 원본 `{cohort}/{user}/{session}/{uuid}.jpg` · 미리보기 `{cohort}/{user}/{session}/{uuid}.thumb.jpg`.
//   같은 폴더에 둔다 — 저장소 정책이 경로 [1]·[2]·[3] 을 읽으므로 폴더를 하나 더 파면 정책이 어긋난다.
//   저장소 이미지 변환은 이 테넌트에 없다(서가 실측 `feature not enabled for this tenant`) — 그래서 올릴 때 만든다.

export const CHECKIN_PHOTO_BUCKET = 'checkin-photos';

const THUMB_SUFFIX = '.thumb.jpg';

export function isThumbPath(path: string): boolean {
  return path.endsWith(THUMB_SUFFIX);
}

/** 원본 경로 → 미리보기 경로. 이미 미리보기면 그대로 돌려준다(두 번 붙지 않는다). */
export function thumbPathOf(path: string): string {
  if (isThumbPath(path)) return path;
  return path.replace(/\.jpg$/, THUMB_SUFFIX);
}

/**
 * 목록(이름들)을 원본 단위로 묶는다 — **순서를 보존한다**(목록 RPC 가 올린 순서로 낸다).
 * 미리보기만 있고 원본이 없는 이름(원본 업로드 실패 뒤 남은 조각)은 내지 않는다 — 누를 것이 없다.
 */
export function pairCheckinPhotoPaths(names: readonly string[]): { path: string; thumb: string | null }[] {
  const all = new Set(names);
  return names
    .filter((n) => !isThumbPath(n))
    .map((path) => {
      const t = thumbPathOf(path);
      return { path, thumb: all.has(t) ? t : null };
    });
}
