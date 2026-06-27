'use client';
// 공용 DotScale — 리커트 강도(§4.2). 5도트(시각 22px / 히트 44px). 선택 도트 골드.
import type { AnswerValue } from '@/contracts';

export function DotScale({
  points,
  value,
  onChange,
  ariaLabel,
}: {
  points: number;
  value: number | null;
  onChange: (v: AnswerValue) => void;
  ariaLabel?: string;
}) {
  const dots = Array.from({ length: points }, (_, i) => i + 1);
  return (
    <div className="ui-dotscale__dots" role="radiogroup" aria-label={ariaLabel}>
      {dots.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} / ${points}`}
          className={`ui-dot${value === n ? ' ui-dot--selected' : ''}`}
          onClick={() => onChange(n)}
        />
      ))}
    </div>
  );
}
