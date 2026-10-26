import type { PairReview, PairTextBlock } from './index';
import type { RequiredField } from './required';

export type PairRow = { index: number; fromKey: string; toKey: string; from: string; to: string };
const text = (a: Record<string, unknown>, key: string) => typeof a[key] === 'string' ? a[key] as string : '';
const keyAt = (key: string, index: number) => index === 0 ? key : `${key}_${index + 1}`;
export const completePair = (row: PairRow) => !!(row.from.trim() && row.to.trim());

export function pairRows(block: PairTextBlock, answers: Record<string, unknown>): PairRow[] {
  const max = block.repeat?.max ?? 1;
  const stored = block.repeat ? answers[block.repeat.countKey] : 1;
  let count = typeof stored === 'number' && Number.isInteger(stored) ? Math.min(max, Math.max(1, stored)) : 1;
  const rows = Array.from({ length: max }, (_, index) => {
    const fromKey = keyAt(block.from.key, index), toKey = keyAt(block.to.key, index);
    const row = { index, fromKey, toKey, from: text(answers, fromKey), to: text(answers, toKey) };
    if (row.from || row.to) count = Math.max(count, index + 1);
    return row;
  });
  return rows.slice(0, count);
}

export function preferredPair(block: PairTextBlock, answers: Record<string, unknown>): PairRow | undefined {
  const rows = pairRows(block, answers).filter(completePair);
  const focus = block.repeat ? answers[block.repeat.focusKey] : 0;
  return rows.find((r) => r.index === focus) ?? rows[0];
}

/** 빈 추가 줄은 무시하지만, 한쪽만 쓴 줄은 놓치지 않는다. */
export function requiredPairFields(block: PairTextBlock, answers: Record<string, unknown>): RequiredField[] {
  const rows = pairRows(block, answers);
  const active = rows.filter((r) => r.from.trim() || r.to.trim());
  return (active.length ? active : rows.slice(0, 1)).flatMap((r) => [
    { key: r.fromKey, label: r.index ? `${block.repeat!.itemLabel} ${r.index + 1} · ${block.from.label}` : block.from.label },
    { key: r.toKey, label: r.index ? `${block.repeat!.itemLabel} ${r.index + 1} · ${block.to.label}` : block.to.label },
  ]);
}

/** 삭제한 줄 뒤의 쌍과 선택을 함께 이동한다. 다른 응답 키는 손대지 않는다. */
export function removePair(block: PairTextBlock, answers: Record<string, unknown>, index: number): Record<string, unknown> {
  if (!block.repeat) return answers;
  const rows = pairRows(block, answers);
  if (rows.length < 2 || !rows[index]) return answers;
  const focus = preferredPair(block, answers)?.index ?? 0;
  const next = { ...answers };
  for (let i = 0; i < block.repeat.max; i++) {
    delete next[keyAt(block.from.key, i)];
    delete next[keyAt(block.to.key, i)];
  }
  const remaining = rows.filter((r) => r.index !== index);
  remaining.forEach((r, i) => {
    next[keyAt(block.from.key, i)] = r.from;
    next[keyAt(block.to.key, i)] = r.to;
  });
  next[block.repeat.countKey] = remaining.length;
  next[block.repeat.focusKey] = focus === index ? 0 : focus > index ? focus - 1 : focus;
  return next;
}

export function reviewPair(review: PairReview, block: PairTextBlock | undefined, prior: Record<string, unknown>, answers: Record<string, unknown>): { from: string; to: string } | undefined {
  if (review.from.key in answers || review.to.key in answers) {
    return { from: text(answers, review.from.key), to: text(answers, review.to.key) };
  }
  return block ? preferredPair(block, prior) : undefined;
}
