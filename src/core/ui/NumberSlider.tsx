'use client';
// 공용 NumberSlider — 간격 거리(§4.3). 0~10 슬라이더 + 큰 값(accent, tabular-nums).
import type { AnswerValue } from '@/contracts';

export function NumberSlider({
  label,
  min,
  max,
  value,
  onChange,
  suffix,
}: {
  label: string;
  min: number;
  max: number;
  value: number | null;
  onChange: (v: AnswerValue) => void;
  suffix?: string;
}) {
  const pos = value ?? min;
  return (
    <div>
      <span className="ui-slider__label t-body-lg">{label}</span>
      <div className="ui-slider">
        <input
          type="range"
          className="ui-slider__range"
          min={min}
          max={max}
          step={1}
          value={pos}
          aria-label={label}
          aria-valuetext={value === null ? undefined : `${value}${suffix ?? ''}`}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="ui-slider__value tnum">{value === null ? '—' : `${value}${suffix ?? ''}`}</span>
      </div>
    </div>
  );
}
