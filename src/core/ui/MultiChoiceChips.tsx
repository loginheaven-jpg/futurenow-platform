'use client';
// 다중 선택 칩(인스트루먼트 중립 — 퓨처나우 전용 낱말·색을 박지 않는다). ADR-80 갈무리 mood 등에서 사용.
// 선택 표시=채움 + 테두리 동시 변화(색맹 대응, design_system §6). 탭 타깃 ≥44px.
// max 초과 시 가장 먼저 고른 것이 빠진다. exclusive 옵션은 배타(고르면 나머지 해제, 다른 걸 고르면 해제).
import type { CSSProperties } from 'react';

// 선택 전이(순수 — 테스트 가능). 규칙: 이미 선택→해제 / 배타 옵션→단독 / 배타 있으면 해제 후 추가 / max 초과→최선입 축출.
export function nextChipSelection(value: string[], opt: string, max: number, exclusive?: string): string[] {
  if (value.includes(opt)) return value.filter((v) => v !== opt);
  if (exclusive && opt === exclusive) return [opt];
  let base = exclusive ? value.filter((v) => v !== exclusive) : value;
  base = [...base, opt];
  while (base.length > max) base = base.slice(1);
  return base;
}

export function MultiChoiceChips({
  options,
  value,
  max,
  exclusive,
  onChange,
  ariaLabel,
}: {
  options: string[];
  value: string[];
  max: number;
  exclusive?: string;
  onChange: (next: string[]) => void;
  ariaLabel?: string;
}) {
  function toggle(opt: string) {
    onChange(nextChipSelection(value, opt, max, exclusive));
  }

  return (
    <div role="group" aria-label={ariaLabel} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
      {options.map((opt) => {
        const selected = value.includes(opt);
        const style: CSSProperties = {
          minHeight: 'var(--tap-min)',
          padding: '0 var(--space-4)',
          borderRadius: 'var(--radius-pill, 999px)',
          border: `var(--border-hair) solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
          background: selected ? 'var(--color-accent)' : 'var(--color-surface-1)',
          color: selected ? 'var(--color-text-on-accent)' : 'var(--color-text)',
          font: 'inherit',
          fontSize: 15,
          cursor: 'pointer',
        };
        return (
          <button key={opt} type="button" role="checkbox" aria-checked={selected} onClick={() => toggle(opt)} style={style}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}
