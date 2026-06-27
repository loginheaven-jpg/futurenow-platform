// 공용 StickyScaleHeader — 리커트 척도 레이블 상단 고정(§4.2).
// 도트와 동일하게 points 등분 열로 렌더 → minLabel↔1번·centerLabel↔중앙·maxLabel↔마지막 정렬.
// centerLabel 있으면 중앙 표기(ADR-20), 없으면 생략.
export function StickyScaleHeader({
  minLabel,
  maxLabel,
  centerLabel,
  points = 5,
}: {
  minLabel: string;
  maxLabel: string;
  centerLabel?: string;
  points?: number;
}) {
  const mid = Math.floor(points / 2);
  return (
    <div className="ui-scalehead t-caption">
      {Array.from({ length: points }, (_, i) => {
        const isCenter = !!centerLabel && i === mid && i !== 0 && i !== points - 1;
        const label = i === 0 ? minLabel : i === points - 1 ? maxLabel : isCenter ? centerLabel : '';
        return (
          <span key={i} className={`ui-scalehead__col${isCenter ? ' ui-scalehead__center' : ''}`}>
            {label}
          </span>
        );
      })}
    </div>
  );
}
