// 1면 슬롯 순회·묶음 경계·되비추기 판정(ADR-90). 순수 함수 — 카드가 이 결과를 그리기만 한다.
//   렌더 규칙을 컴포넌트 안에 두면 "1·2회차 출력이 정말 그대로인가"를 테스트로 증명할 수 없다.
import { type BlockBase, type CheckinSession, type Mirror, type MirrorSet, type SlotName } from './index';

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

// ── 되비추기 깊이(ADR-103) ─────────────────────────────────────────────────
// 봉투를 깊이별로 나눈다. **병합하지 않는다** — step_what·step_when·mood·self_note 는 회차 공용 키라
//   한 봉투에 합치면 지난 걸음 되비추기가 다른 회차 값을 읽고 참여자에게 **틀린 문장**이 보인다.
//   키는 '몇 회차 전'이고 값은 그 회차의 answers(없으면 null).
export type Priors = Record<number, Record<string, unknown> | null>;

/**
 * 이 회차 문안이 요구하는 되비추기 깊이 전부(중복 없는 오름차순).
 *
 * **회차 번호가 아니라 문안이 정한다.** 번호로 분기하면 5·6·7회차에서 다시 고쳐야 하고,
 * 그것이 ADR-90 이 없앤 특례다. 1·2·3회차는 [1], 4회차는 [1, 2] 다.
 */
export function neededBacks(copy: CheckinSession): number[] {
  const out = new Set<number>();
  const take = (m: Mirror | undefined) => { if (m) out.add(m.back ?? 1); };
  // ★ 다중 되비추기(ADR-115)도 훑는다. **빠뜨리면 깊이를 안 불러 되비추기가 조용히 사라진다.**
  const takeSet = (set: MirrorSet | undefined) => { if (set) for (const m of set.items) take(m); };
  for (const s of orderedSlots(copy)) { take(s.block.mirror); takeSet(s.block.mirrors); }
  for (const f of copy.deepen.fields) take(f.mirror);
  take(copy.step.lastStep?.mirror);
  takeSet(copy.wrap.selfNote.mirrors);
  return [...out].sort((a, b) => a - b);
}

/**
 * 어느 회차를 조회할지. 페이지의 분기를 순수 함수로 뽑아 테스트 가능하게 둔다.
 *
 * 열람(read)에는 싣지 않는다 — 되비추기는 '지금 쓰는 것을 돕는' 작성 보조다(ADR-86).
 * 존재하지 않는 회차(0 이하)는 거른다. **상한을 두지 않는다** — 7회차가 2회차를 되비추면 5 다.
 */
export function priorSessionNos(sessionNo: number, mode: 'edit' | 'read', backs: number[]): number[] {
  if (mode !== 'edit') return [];
  return backs.map((b) => sessionNo - b).filter((n) => n >= 1);
}

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
export type MirrorSetView = { caption?: string; rows: { label: string; value: string }[] } | null;

/**
 * 다중 되비추기 판정(ADR-115). **`resolveMirror` 를 재사용한다** —
 *   앵커 규칙 · trim 규칙 · `empty` 규칙이 그대로 상속돼야 하기 때문이다.
 *
 * **값이 있는 항목만 줄로 남긴다.** 하나도 없으면 `null` — 상자 자체를 그리지 않는다.
 * `MirrorSet` 항목에는 `empty` 를 쓰지 않는다 — 다섯 줄 중 셋이 비었을 때
 *   빈 문구 셋이 쌓이면 **화면이 결손 목록**이 된다.
 */
export function resolveMirrorSet(set: MirrorSet | undefined, priors: Priors): MirrorSetView {
  if (!set) return null;
  const rows = set.items
    .map((m) => resolveMirror(m, priors))
    .filter((v): v is { kind: 'value'; label: string; value: string } => v?.kind === 'value')
    .map(({ label, value }) => ({ label, value }));
  return rows.length ? { caption: set.caption, rows } : null;
}

export function resolveMirror(mirror: Mirror | undefined, priors: Priors): MirrorView {
  if (!mirror) return null;
  const prior = priors[mirror.back ?? 1] ?? null;
  const raw = (k: string) => (prior && typeof prior[k] === 'string' ? (prior[k] as string) : '');
  const present = (k: string) => raw(k).trim() !== '';
  const anchor = mirror.keys[0];
  if (anchor && present(anchor)) {
    return { kind: 'value', label: mirror.label, value: mirror.keys.filter(present).map(raw).join(' · ') };
  }
  return mirror.empty ? { kind: 'empty', text: mirror.empty } : null;
}
