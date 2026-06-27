'use client';
// 공용 TextArea — 주관식(§4.4). 배경 surface-sunken, placeholder 존대체. 글자수는 우하단 micro.
export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLen,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLen?: number;
  ariaLabel?: string;
}) {
  return (
    <div>
      <textarea
        className="ui-textarea t-body-lg"
        rows={rows}
        placeholder={placeholder}
        maxLength={maxLen}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {maxLen ? (
        <span className="ui-textarea__count t-micro tnum">
          {value.length} / {maxLen}
        </span>
      ) : null}
    </div>
  );
}
