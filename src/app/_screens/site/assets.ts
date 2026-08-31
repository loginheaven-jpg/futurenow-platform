// 이미지 자산이 **실제로 도착했는가** — 목록을 손으로 들지 않고 **파일을 본다**.
//
// 원고 §5 가 세 자산의 **파일명을 이미 정해 두었다**(§5.1 `leader-lseungeun.jpg` ·
//   §5.2 `leader-cchulyoung.jpg` · §5.3 `book-cover-futurenow.png`). 정해지지 않은 것은
//   **어느 것이 도착했는가**이고, 그것은 원고가 아니라 `public/` 이 안다.
//
// ★ **손으로 목록을 들지 않는 이유.** 「지금 도착한 것은 둘」은 **따라가야 하는 값**이라
//   적는 순간 낡는다(CLAUDE.md §11 ⑴). 최철영 사진이 `public/leaders/` 에 놓이는 날
//   목록을 함께 고쳐야 하는데, **그 두 손이 같은 날 움직인다는 보장이 없다.**
//   파일을 보면 낡을 수가 없다 — 놓으면 켜지고 빼면 자리표시자로 돌아간다.
//
// ★ **`siteContent.ts` 를 건드리지 않는다.** 그 파일은 원고에서 **뽑아 넣은 것**이고
//   머리에 *「손으로 고치지 않는다」* 가 적혀 있다. 도착 여부는 원고의 사실이 아니므로
//   여기 산다.
//
// 이 함수는 **서버에서만** 돈다(`/about` 은 서버 컴포넌트이고 빌드 때 정적으로 굳는다).
//   클라이언트 번들에 `node:fs` 가 실려 가지 않는다.
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `public/` 아래 그 파일이 실재하면 **웹 경로**를, 없으면 `undefined` 를 돌려준다.
 *
 * 부품들은 `src` 가 없으면 자리표시자를 세운다(원고 §6.2 — 3종 공란).
 *   그러므로 **없는 파일을 가리켜 깨진 그림을 그리는 일이 없다.**
 *
 * @param webPath `/leaders/leader-lseungeun.jpg` 처럼 **앞에 슬래시가 붙은** 웹 경로
 */
export function assetIfPresent(webPath: string): string | undefined {
  // `process.cwd()` 는 Next 빌드·실행 모두 프로젝트 뿌리다.
  return existsSync(join(process.cwd(), 'public', webPath.replace(/^\//, ''))) ? webPath : undefined;
}

/** 인물 사진이 사는 곳. 원고 §5 가 `public/leaders/` 로 정했다. */
export const LEADER_DIR = '/leaders';
/** 도서 표지가 사는 곳. */
export const BOOK_DIR = '/book';
