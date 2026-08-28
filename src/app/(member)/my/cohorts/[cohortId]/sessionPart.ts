// 회차 → GROW+F 파트 — 순수 (4차 F-4 · 시안 C `.my-head` h3).
//
// 시안 C 의 머리는 `PART 1 · GOAL — 미래의 나를 만나다` 다.
//   뒤쪽 제목은 회차 문안(`cover.subtitle`)에서 오고, **앞쪽 파트는 여기서 온다.**
//
// **강의 어휘가 아니라 여정 구조다.** GROW+F 는 이미 공개 현관·`/about` 에 그대로 서 있고
//   도서 부제이기도 하다. §7 이 참여자 경로에서 막는 것은 **구인명·STEP·측정 어휘**이지
//   여정의 단계 이름이 아니다(불변식 6 은 `Item.prompt` 에 걸린다).
//
// **회차 수를 6 으로 박지 않는다** — 매핑 밖 회차는 `null` 이고, 화면은 그 줄을 그리지 않는다.
//   5주·8주 편성이 오면 여기 표 한 줄만 는다.

export interface SessionPart {
  /** 표시용 번호 — 시안의 `PART 1`. */
  no: number;
  letter: string;
  en: string;
}

/** 시안 P1 `.grid-f` · 원고 §3.3 과 **같은 다섯 축**이다. 순서가 곧 파트 번호다. */
const PARTS: { letter: string; en: string; sessions: number[] }[] = [
  { letter: 'G', en: 'GOAL', sessions: [1, 2] },
  { letter: 'R', en: 'REALITY', sessions: [3] },
  { letter: 'O', en: 'OPTIONS', sessions: [4] },
  { letter: 'W', en: 'WILL', sessions: [5] },
  { letter: 'F', en: 'FAITH', sessions: [6] },
];

/** 회차 번호의 파트. 모르는 회차는 `null` — **지어내지 않는다.** */
export function sessionPart(sessionNo: number | null | undefined): SessionPart | null {
  if (sessionNo == null) return null;
  const i = PARTS.findIndex((p) => p.sessions.includes(sessionNo));
  return i < 0 ? null : { no: i + 1, letter: PARTS[i].letter, en: PARTS[i].en };
}

/** `PART 1 · GOAL` — 시안 C 표기 그대로. 파트가 없으면 빈 문자열이 아니라 `null` 이다. */
export function sessionPartLabel(sessionNo: number | null | undefined): string | null {
  const p = sessionPart(sessionNo);
  return p ? `PART ${p.no} · ${p.en}` : null;
}
