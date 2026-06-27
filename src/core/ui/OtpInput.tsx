'use client';
// 공용 OtpInput — 참여 코드 5칸 분할(§7.1). 입력 중/채움 골드 테두리·빈 칸 회색. 인스트루먼트 중립.
// 혼동글자(0/O/1/I/L) 제외·대문자(cohorts.code 형식). 자동 이동·백스페이스·붙여넣기 지원.
import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

// 허용 글자: 0/O/1/I/L 제외, 대문자(cohorts.code 형식)
const clean = (s: string) => s.toUpperCase().replace(/[^A-HJKMNP-Z2-9]/g, '');

export function OtpInput({
  length = 5,
  value,
  onChange,
}: {
  length?: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? '');

  function setChar(i: number, raw: string) {
    const c = clean(raw).slice(-1);
    if (raw && !c) return; // 허용되지 않는 글자
    const next = (value.slice(0, i) + c + value.slice(i + 1)).slice(0, length);
    onChange(next);
    if (c && i < length - 1) refs.current[i + 1]?.focus();
  }
  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !chars[i] && i > 0) refs.current[i - 1]?.focus();
  }
  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const t = clean(e.clipboardData.getData('text')).slice(0, length);
    if (!t) return;
    e.preventDefault();
    onChange(t);
    refs.current[Math.min(t.length, length - 1)]?.focus();
  }

  return (
    <div className="ui-otp" role="group" aria-label={`참여 코드 ${length}자리`}>
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={`ui-otp__cell${c ? ' ui-otp__cell--filled' : ''}`}
          inputMode="text"
          autoComplete="off"
          maxLength={1}
          value={c}
          aria-label={`${i + 1}번째 글자`}
          onChange={(e) => setChar(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
        />
      ))}
    </div>
  );
}
