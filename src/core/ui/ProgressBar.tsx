// 공용 ProgressBar — 트랙 surface-sunken, 채움 accent(ui.css). '7/17'류 진행.
export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  return (
    <div
      className="ui-progress"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className="ui-progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
