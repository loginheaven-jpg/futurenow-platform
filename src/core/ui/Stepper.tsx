'use client';
// 공용 Stepper — 정원 −/+ (§8.2). ≥44px 버튼. 인스트루먼트 중립.
export function Stepper({
  value,
  min = 1,
  max = 999,
  onChange,
  label,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  return (
    <div className="ui-stepper" role="group" aria-label={label}>
      <button
        type="button"
        className="ui-stepper__btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="감소"
      >
        −
      </button>
      <span className="ui-stepper__val tnum" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="ui-stepper__btn"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="증가"
      >
        +
      </button>
    </div>
  );
}
