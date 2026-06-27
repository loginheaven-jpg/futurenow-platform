'use client';
// 공용 CheckRow — 체크 토글(§4.5). 텍스트(좌) + 박스(우). 평범한 외양 — 경고색·느낌표 금지.
// 선택 시 행 골드 소프트 + 박스 골드. 카드 전체가 탭 타깃. 참여자는 신호 분류를 모른다(§9.4).
export function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={`ui-checkrow t-body-lg${checked ? ' ui-checkrow--checked' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="ui-checkrow__text">{label}</span>
      <span className="ui-checkrow__box" aria-hidden="true">
        {checked ? '✓' : ''}
      </span>
    </button>
  );
}
