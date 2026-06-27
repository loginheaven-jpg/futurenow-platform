// 공용 StickyScaleHeader — 리커트 척도 레이블 상단 고정(§4.2). centerLabel 있으면 중앙 표기(ADR-20).
export function StickyScaleHeader({
  minLabel,
  maxLabel,
  centerLabel,
}: {
  minLabel: string;
  maxLabel: string;
  centerLabel?: string;
}) {
  return (
    <div className="ui-scalehead t-caption">
      <span>{minLabel}</span>
      {centerLabel ? <span className="ui-scalehead__center">{centerLabel}</span> : null}
      <span>{maxLabel}</span>
    </div>
  );
}
