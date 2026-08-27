// `/recruit` 우측 카드 그리드 — **선정·순서·alt 의 단일 출처** (4차 F-4 후속).
//
// **순서가 곧 뜻이다**(지휘부 판정): 문제(2) → 문제(3) → 답(6) → 증언(7).
//   *"문제에서 답, 증언으로 가는 흐름이 순서에 실려 있다."* 화면은 이 배열을 다시 정렬하지 않는다.
//
// **`alt` 는 각 장의 내용 한 줄**이다. 이미지 속 글자는 스크린리더가 읽지 못하므로
//   이 문장이 그 장의 **유일한 접근 경로**다 — 장식이 아니라 내용을 적는다.
//   문안은 `docs/tasks/예봄2기_모집카드뉴스_원고_확정 (1).md` 에서 뽑았다.
//
// **`src` 는 파생물이다.** 원본은 `docs/tasks/cards/card_NN.png`(무접촉)이고
//   `public/recruit/*.webp` 는 `scripts/recruit-cards.mjs` 가 만든다.
//   **그 스크립트가 이 파일을 읽는다** — 목록이 둘이면 파일과 alt 가 어긋난다.

export interface RecruitCard {
  /** 카드뉴스 원본 번호(원고 절 번호와 같다). */
  n: number;
  src: string;
  alt: string;
}

export const RECRUIT_CARDS: RecruitCard[] = [
  { n: 2, src: '/recruit/card-02.webp', alt: '계획은 매년 세웠다 — 3월이면 사라진다. 의지가 약해서가 아닙니다.' },
  { n: 3, src: '/recruit/card-03.webp', alt: '방향이 없으면 속도는 의미가 없다 — 게으름이 아니라 설계의 문제입니다.' },
  { n: 6, src: '/recruit/card-06.webp', alt: '손에 남는 것 — 존재가치 선언문, 인생 조감도, 단 하나의 도미노, 환경 설계도.' },
  { n: 7, src: '/recruit/card-07.webp', alt: '1기 참여자의 말 — 준비만 잘해서 문제였다, 채울 걸 먼저 정하니 될 것 같더라.' },
];
