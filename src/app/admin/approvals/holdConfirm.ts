// 이용 보류 확인 — **읽지 않고는 못 지나가는 화면**의 내용 (최박사 확정 2026-08-30)
//
// ⚠ **문안은 지휘부 초안이고 최박사 확정 전이다.**
//   문안은 **얼어야 하는 값**이지만 아직 얼지 않았으므로, 그 사실이 보여야 한다.
//   확정되면 이 주석을 걷고 `holdConfirm.test.ts` 의 초안 표시 단언도 함께 걷는다.
//
// **왜 예·아니오가 아닌가**(최박사 확정): 사람은 그런 물음을 **읽지 않고 누르는 법을 배운다.**
//   이 버튼은 이제 강퇴이므로 읽지 않고는 못 지나가야 한다. 그래서 근거 메모를 **필수**로 둔다 —
//   무언가를 쓰려면 대상을 읽어야 한다. 승인 취소 정책에서 이미 확정된 규칙을 이 자리에 적용한 것이다.
//
// **일반 회원 보류에도 같은 확인을 건다.** 대상이 운영자일 때만 두면 두 경로가 갈리고,
//   **갈리면 한쪽만 고치는 날이 온다.** 달라지는 것은 (2) 문장 하나뿐이다.
//
// **이 확인은 화면 층이고 서버 가드를 대신하지 않는다.**
//   서버(`decide_membership`)가 슈퍼어드민 대상 거부 · 자기 자신 거부 · 운영자 보류는 슈퍼어드민만을
//   강제한다. **그쪽이 실제 방어선**이고 여기는 사람이 실수하지 않게 돕는 자리다.
//   화면에서 버튼을 감추는 것은 안전장치가 아니다(발주 §4.4).

/** 확인 화면이 보여 줄 것 넷. 화면은 이 값을 그리기만 한다 — 문장을 만들지 않는다. */
export interface HoldConfirm {
  /** (1) 대상이 누구인지 — 잘못 고른 것이 여기서 드러난다 */
  who: { name: string; email: string };
  /** (2) 무엇을 잃는지 — 대상이 운영자면 문장이 달라진다 */
  loses: string;
  /** (3) 근거 메모가 필수라는 안내 */
  noteRequired: string;
  /** (4) 되돌리는 법 — 누가 풀 수 있는지 한 줄 */
  undo: string;
}

/** (2) 일반 회원 — 지휘부 초안 · 최박사 확정 전 */
export const LOSES_MEMBER =
  '이 분은 로그인하실 수 없게 되고, 세미나·진단·기록을 모두 이용하실 수 없습니다.';

/** (2) 운영자 — 지휘부 초안 · 최박사 확정 전 */
export const LOSES_ADMIN =
  '이 분은 로그인하실 수 없게 되고, 운영 화면도 함께 닫힙니다. 되돌리는 것은 슈퍼어드민만 하실 수 있습니다.';

/** (3) 지휘부 초안 · 최박사 확정 전 */
export const NOTE_REQUIRED = '근거 메모를 남기셔야 진행됩니다. 왜 보류하시는지 한 줄로 적어 주십시오.';

/** (4) 지휘부 초안 · 최박사 확정 전 */
export const UNDO_MEMBER = '되돌리는 것은 운영자가 하실 수 있습니다.';
export const UNDO_ADMIN = '되돌리는 것은 슈퍼어드민만 하실 수 있습니다.';

/**
 * 확인 내용을 만든다. **순수 함수다** — 화면이 문장을 짜지 않게 한다.
 *
 * `targetIsAdmin` 은 **대상의** 운영자 여부다(누르는 사람이 아니다).
 * 헷갈리기 쉬운 자리라 이름에 `target` 을 넣었다 — 잘못 넘기면 잃는 것을 잘못 알린다.
 */
export function holdConfirm(input: {
  name: string | null;
  email: string | null;
  targetIsAdmin: boolean;
}): HoldConfirm {
  return {
    // **비어 있어도 자리를 비우지 않는다.** 이름이 없다고 줄이 사라지면
    //   운영자가 "누구를 고른 거지" 를 화면에서 확인할 수 없다.
    who: { name: input.name ?? '(이름 없음)', email: input.email ?? '(계정 정보 없음)' },
    loses: input.targetIsAdmin ? LOSES_ADMIN : LOSES_MEMBER,
    noteRequired: NOTE_REQUIRED,
    undo: input.targetIsAdmin ? UNDO_ADMIN : UNDO_MEMBER,
  };
}

/**
 * 진행 가능 여부 — **근거 메모가 비면 진행되지 않는다**(최박사 확정 (3)).
 *
 * 공백만 적은 것도 빈 것으로 친다. **공백을 통과시키면 규칙이 형식만 남는다** —
 * 스페이스 하나를 누르는 법을 배우게 되고, 그것이 이 확인이 막으려던 바로 그 일이다.
 */
export function holdCanProceed(note: string | null | undefined): boolean {
  return (note ?? '').trim().length > 0;
}
