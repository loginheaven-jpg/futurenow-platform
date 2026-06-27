'use client';
// 공용 SegmentBar — 나침반(bipolar, §4.1). 5칸 세그먼트, 중앙 유지. 선택 칸 골드. 양극 레이블 위.
import type { AnswerValue } from '@/contracts';

export function SegmentBar({
  points,
  leftLabel,
  rightLabel,
  value,
  onChange,
}: {
  points: number;
  leftLabel: string;
  rightLabel: string;
  value: number | null;
  onChange: (v: AnswerValue) => void;
}) {
  const cells = Array.from({ length: points }, (_, i) => i + 1);
  return (
    <div>
      <div className="ui-seg__labels t-caption">
        <span className="ui-seg__label--left">{leftLabel}</span>
        <span className="ui-seg__label--right">{rightLabel}</span>
      </div>
      <div className="ui-seg" role="radiogroup" aria-label={`${leftLabel} ↔ ${rightLabel}`}>
        {cells.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} / ${points}`}
            className={`ui-seg__cell${value === n ? ' ui-seg__cell--selected' : ''}`}
            onClick={() => onChange(n)}
          />
        ))}
      </div>
    </div>
  );
}
