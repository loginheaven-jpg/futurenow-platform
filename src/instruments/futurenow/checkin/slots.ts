// 1면 슬롯 순회·묶음 경계·되비추기 판정(ADR-90). 순수 함수 — 카드가 이 결과를 그리기만 한다.
//   렌더 규칙을 컴포넌트 안에 두면 "1·2회차 출력이 정말 그대로인가"를 테스트로 증명할 수 없다.
import { type BlockBase, type CheckinSession, type Mirror, type SlotName } from './index';

export type OrderedSlot = { name: SlotName; block: BlockBase };

/** order 가 정한 순서대로, 실제로 존재하는 슬롯만. 회차 번호로 분기하지 않는다. */
export function orderedSlots(copy: CheckinSession): OrderedSlot[] {
  return copy.today.order
    .map((name) => ({ name, block: copy.today[name] as BlockBase | undefined }))
    .filter((s): s is OrderedSlot => !!s.block);
}

/** 묶음 경계. null 이면 아무것도 그리지 않는다. */
export type Boundary = { line: boolean; caption?: string } | null;

/**
 * 지휘부 확정 규칙(2026-08-03): **현재 블록의 group 이 직전 블록과 다르면 경계를 그린다.**
 *   값이 있으면 hairline + 캡션, 없으면 hairline 만.
 *   예외 — 면의 첫 블록이면 hairline 을 생략하고 캡션만(바로 위가 표지라 선이 겹친다).
 *
 * 이 한 문장이 네 전이를 모두 덮는다:
 *   없음→A(캡션+선) · A→A(없음) · A→B(선+캡션) · A→없음(선만)
 */
export function groupBoundary(group: string | undefined, prev: string | undefined, first: boolean): Boundary {
  if (group === prev) return null;
  return group ? { line: !first, caption: group } : { line: !first };
}

/** 한 회차 1면의 경계 배열(슬롯과 같은 길이). 단일 STEP 회차는 전부 null 이어야 한다. */
export function slotBoundaries(copy: CheckinSession): Boundary[] {
  const slots = orderedSlots(copy);
  return slots.map((s, i) => groupBoundary(s.block.group, i === 0 ? undefined : slots[i - 1].block.group, i === 0));
}

/** 되비추기 판정 결과. null 이면 아무것도 그리지 않는다. */
export type MirrorView = { kind: 'value'; label: string; value: string } | { kind: 'empty'; text: string } | null;

/**
 * 되비추기 값 판정(ADR-90).
 *
 * **keys[0] 은 앵커다 — 앵커가 비면 나머지 값이 있어도 되비추지 않는다.**
 * ADR-85 의 현행 렌더가 `prior.stepWhat` 하나를 게이트로 삼았기 때문이고, 그게 옳다:
 * '무엇을' 없이 '언제·어디서'만 되비추면 한 걸음이 아니라 시점만 남아 문장이 되지 않는다.
 * (앵커를 두지 않고 '하나라도 있으면'으로 하면 step_when 만 저장된 초안에서 화면이 달라진다 —
 *  자동저장이 미제출 초안도 그대로 남기므로 실제로 도달 가능한 상태다.)
 *
 * 존재 판정만 trim 하고, 출력에는 원문을 쓴다(현행 렌더와 바이트 동일).
 */
export function resolveMirror(mirror: Mirror | undefined, prior: Record<string, unknown> | null): MirrorView {
  if (!mirror) return null;
  const raw = (k: string) => (prior && typeof prior[k] === 'string' ? (prior[k] as string) : '');
  const present = (k: string) => raw(k).trim() !== '';
  const anchor = mirror.keys[0];
  if (anchor && present(anchor)) {
    return { kind: 'value', label: mirror.label, value: mirror.keys.filter(present).map(raw).join(' · ') };
  }
  return mirror.empty ? { kind: 'empty', text: mirror.empty } : null;
}
