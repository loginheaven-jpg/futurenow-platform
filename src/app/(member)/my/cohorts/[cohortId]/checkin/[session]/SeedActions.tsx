'use client';
import type { SeedBlock } from '@/instruments/futurenow/checkin';
import { Button } from '@/core/ui';
import styles from './SeedActions.module.css';

export function SeedActions({ block, answers, onChange, onBlur, onSelect, isEmpty }: {
  block: SeedBlock;
  answers: Record<string, unknown>;
  onChange: (key: string, value: string) => void;
  onBlur: () => void;
  onSelect: (value: string) => void;
  isEmpty: (key: string) => boolean;
}) {
  const value = (key: string) => typeof answers[key] === 'string' ? answers[key] as string : '';
  const fields = block.layers.flatMap((layer) => layer.fields);
  const filled = fields.filter((f) => value(f.key).trim()).length;
  return (
    <section className={styles.seed} aria-label={block.title}>
      <h2 className="t-h2">{block.title}</h2>
      <p className="t-body">{block.help}</p>
      <p className="t-caption">{block.guide}</p>
      <div className={styles.terms}>{block.terms.map((term) => (
        <div key={term.title}><strong>{term.title}</strong><p className="t-caption">{term.help}</p></div>
      ))}</div>
      <div className={styles.count} aria-live="polite">{block.counterLabel} · {filled} / {fields.length}</div>
      {block.layers.map((layer) => (
        <section className={styles.layer} key={layer.id} aria-label={layer.title}>
          <div className={styles.heading}>
            <div><h3 className="t-body-lg">{layer.title}</h3><p className="t-caption">{layer.help}</p></div>
            <span className="t-caption">{layer.fields.filter((f) => value(f.key).trim()).length} / {layer.fields.length}</span>
          </div>
          <div className={styles.grid}>
            {layer.fields.map((f) => (
              <div key={f.key} id={`fld-${f.key}`} className={styles.field}>
                <label htmlFor={`input-${f.key}`}>{f.label}</label>
                {isEmpty(f.key) ? <span className="t-caption">아직 비어 있어요</span> : null}
                <p className="t-caption" id={`help-${f.key}`}>{f.help}</p>
                <textarea id={`input-${f.key}`} className="ui-textarea t-body" rows={4} maxLength={2000}
                  value={value(f.key)} placeholder={f.placeholder} aria-required="true" aria-describedby={`help-${f.key}`}
                  onChange={(e) => onChange(f.key, e.target.value)} onBlur={onBlur} />
                <Button variant="ghost" disabled={!value(f.key).trim()} onClick={() => onSelect(value(f.key).trim())}>
                  {block.selectLabel}
                </Button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
