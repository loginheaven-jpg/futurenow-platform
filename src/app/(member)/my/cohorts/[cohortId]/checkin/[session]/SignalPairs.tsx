'use client';

import { Button } from '@/core/ui';
import type { PairReview, PairTextBlock } from '@/instruments/futurenow/checkin';
import { completePair, pairRows, preferredPair, removePair, reviewPair } from '@/instruments/futurenow/checkin/pairs';

const inputStyle = {
  width: '100%', minHeight: 'var(--tap-min)', padding: '0 var(--space-3)',
  border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius)',
  background: 'var(--color-surface-2)', color: 'var(--color-text)', font: 'inherit', fontSize: 15,
} as const;
const stack = { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' } as const;

export function SignalPairs({ block, answers, onChange, isEmpty }: {
  block: PairTextBlock; answers: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void; isEmpty: (key: string) => boolean;
}) {
  const repeat = block.repeat!;
  const rows = pairRows(block, answers);
  const focused = preferredPair(block, answers)?.index ?? 0;
  return <fieldset aria-label={block.label} style={{ ...stack, border: 0, padding: 0, margin: '0 0 var(--space-5)', minWidth: 0 }}>
    <legend style={{ fontSize: 15, fontWeight: 500, marginBottom: 'var(--space-2)' }}>{block.label}</legend>
    <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{block.help}</p>
    {rows.map((row) => <fieldset key={row.index} aria-label={`${repeat.itemLabel} ${row.index + 1}`} style={{ ...stack, minWidth: 0, margin: 0, padding: 'var(--space-3)', border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius)' }}>
      <legend className="t-caption">{repeat.itemLabel} {row.index + 1}</legend>
      {[{ field: block.from, key: row.fromKey, value: row.from }, { field: block.to, key: row.toKey, value: row.to }].map(({ field, key, value }) => <label key={key} id={`fld-${key}`} style={{ ...stack, gap: 'var(--space-1)' }}>
        <span className="t-caption">{field.label}{isEmpty(key) ? ' · 아직 비어 있어요' : ''}</span>
        <input style={inputStyle} value={value} maxLength={1000} placeholder={field.placeholder} onChange={(e) => onChange({ ...answers, [key]: e.target.value })} />
      </label>)}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <label className="t-caption" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minHeight: 'var(--tap-min)' }}>
          <input type="radio" name={repeat.focusKey} style={{ accentColor: 'var(--color-accent)' }} checked={focused === row.index} disabled={!completePair(row)} onChange={() => onChange({ ...answers, [repeat.focusKey]: row.index })} />
          {repeat.focusLabel}
        </label>
        {rows.length > 1 ? <Button variant="ghost" onClick={() => onChange(removePair(block, answers, row.index))} aria-label={`${repeat.itemLabel} ${row.index + 1} ${repeat.removeLabel}`}>{repeat.removeLabel}</Button> : null}
      </div>
    </fieldset>)}
    {rows.length < repeat.max ? <Button variant="ghost" onClick={() => onChange({ ...answers, [repeat.countKey]: rows.length + 1 })}>+ {repeat.addLabel}</Button> : null}
  </fieldset>;
}

export function SignalReview({ review, block, prior, answers, onSelect }: {
  review: PairReview; block?: PairTextBlock; prior: Record<string, unknown>; answers: Record<string, unknown>;
  onSelect: (from: string, to: string) => void;
}) {
  const rows = block ? pairRows(block, prior).filter(completePair) : [];
  const selected = reviewPair(review, block, prior, answers);
  const matches = rows.find((row) => row.from === selected?.from && row.to === selected?.to);
  return <div style={{ ...stack, marginBottom: 'var(--space-4)' }}>
    {rows.length ? <>
      <label className="t-caption" style={stack}>
        {review.label}
        <select style={{ ...inputStyle, minWidth: 0 }} value={matches?.index ?? 'saved'} onChange={(e) => {
          const row = rows.find((r) => r.index === Number(e.target.value));
          if (row) onSelect(row.from, row.to);
        }}>
          {!matches && selected ? <option value="saved">{selected.from} → {selected.to}</option> : null}
          {rows.map((row) => <option key={row.index} value={row.index}>{row.from} → {row.to}</option>)}
        </select>
      </label>
      <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: 0, overflowWrap: 'anywhere' }}>{selected?.from} → {selected?.to}</p>
    </> : <>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{review.empty}</p>
      {[{ field: review.from, value: selected?.from ?? '', side: 'from' }, { field: review.to, value: selected?.to ?? '', side: 'to' }].map(({ field, value, side }) => <label key={field.key} className="t-caption" style={stack}>
        {field.label}
        <input style={inputStyle} value={value} maxLength={1000} onChange={(e) => onSelect(side === 'from' ? e.target.value : selected?.from ?? '', side === 'to' ? e.target.value : selected?.to ?? '')} />
      </label>)}
    </>}
  </div>;
}
