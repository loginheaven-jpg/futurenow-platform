// MenuSheet 키 판정 — **순수 함수** (4차 F-1).
//
// **focus trap · ESC 는 게이트 항목이다**(지휘부 강조 ②). 그런데 이 저장소의 테스트 환경은
//   `node` 이고 jsdom 이 없다 — DOM 을 띄워 탭을 눌러 볼 수 없다.
//   **의존성을 새로 들이는 대신 판정을 떼어 낸다**: 어느 키에 무엇을 할지는 순수 계산이고,
//   남는 것은 그 결정을 DOM 에 연결하는 배선뿐이다.
//   (`loginOutcome`·`safeReturnTo`·`rosterModel`·`consoleNav` 와 같은 관행)
//
// **가장자리에서만 감아 돈다.** 가운데서는 브라우저 기본 탭 순서를 그대로 둔다 —
//   직접 옮기면 읽기 순서와 어긋나는 날이 온다.

export type SheetKeyAction =
  /** 시트를 닫는다(ESC) */
  | 'close'
  /** 첫 요소로 감아 돈다 */
  | 'focus-first'
  /** 마지막 요소로 감아 돈다 */
  | 'focus-last'
  /** 브라우저 기본 동작에 맡긴다 */
  | 'pass';

export function sheetKeyAction(input: {
  key: string;
  shiftKey: boolean;
  /** 지금 초점이 시트의 **첫** 요소인가 */
  atFirst: boolean;
  /** 지금 초점이 시트의 **마지막** 요소인가 */
  atLast: boolean;
  /** 초점이 시트 **안**에 있는가. 밖이면(뒤 화면으로 샜으면) 다시 끌어온다 */
  inside: boolean;
  /** 시트 안에 초점 받을 것이 하나도 없으면 가둘 수 없다 */
  hasFocusable: boolean;
}): SheetKeyAction {
  const { key, shiftKey, atFirst, atLast, inside, hasFocusable } = input;
  if (key === 'Escape') return 'close';
  if (key !== 'Tab') return 'pass';
  if (!hasFocusable) return 'pass';
  // 초점이 밖으로 샜으면 방향에 맞는 끝으로 끌어온다 — **놓치는 것**이 갇히는 것보다 나쁘다.
  if (!inside) return shiftKey ? 'focus-last' : 'focus-first';
  if (shiftKey && atFirst) return 'focus-last';
  if (!shiftKey && atLast) return 'focus-first';
  return 'pass';
}

/**
 * 바깥 탭 닫힘 판정. **오버레이 자신에서 시작한 눌림만** 닫는다 —
 * 시트 안에서 눌러 밖에서 뗀 드래그가 시트를 닫으면 사용자는 자기가 뭘 했는지 모른다.
 */
export function shouldCloseOnOverlay(input: { targetIsOverlay: boolean }): boolean {
  return input.targetIsOverlay;
}
