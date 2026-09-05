// 마무리 체크 — **문 하나 · 문안 하나** (U-8 · 지휘부 지시 2026-09-03 「여러 방식으로 마무리를 독려」).
//
// ─────────────────────────────────────────────────────────────────────────────
// **왜 모으는가.**
//   ⑴ **주소가 사본 넷이었다** — `/join?cohort=…&wave=post` 를 참여자 홈·체크 허브·내 세미나·
//      회기 대시보드가 각자 손으로 적고 있었다(U-8 실측). 파라미터 하나가 바뀌면 넷이 어긋난다.
//   ⑵ **독려 문구를 새로 짓지 않는다.** 참여자 홈이 이미 확정 문안 두 줄을 쓰고 있으므로
//      인도자가 보낼 안내도 **그것을 그대로 읽는다.** 그래야 참여자가 카톡에서 읽는 말과
//      로그인해서 보는 말이 같다 — 다르면 «다른 것을 말하나» 하고 멈춘다.
//
// **여기 없는 것**: 버튼 라벨. 그것은 화면의 사정이라 화면이 든다.
// ─────────────────────────────────────────────────────────────────────────────
import { TOOL } from './tool';

/** 마무리 체크로 들어가는 **유일한 문**. 이미 가입한 사람의 재진입이라 코드가 아니라 회기 id 다. */
export function postJoinHref(cohortId: string): string {
  return `/join?cohort=${cohortId}&wave=post`;
}

/** 참여자 홈 배너의 머리 — 인도자 안내도 이 줄을 그대로 쓴다. */
export const POST_OPEN_HEAD = `${TOOL.post}가 열렸어요`;

/** 참여자 홈 배너의 본문 — 회기 이름이 앞에 선다. */
export function postOpenBody(cohortName: string): string {
  return `${cohortName} · 세미나를 마친 지금의 나를 담아 주세요.`;
}

/**
 * 인도자가 카톡 등으로 보낼 안내 — **화면의 두 줄 + 주소**.
 * `origin` 은 부르는 쪽이 준다(부품이 `window` 를 읽지 않는다 — 서버 렌더에서 갈린다).
 */
export function postNudgeText(cohortName: string, cohortId: string, origin: string): string {
  return `${POST_OPEN_HEAD}\n${postOpenBody(cohortName)}\n${origin}${postJoinHref(cohortId)}`;
}
