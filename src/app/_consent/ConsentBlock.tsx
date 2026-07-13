'use client';
// 개인정보 동의 블록(재사용) — 고지 문안 + 동의 체크박스. 가입·서약·소급 게이트 공용. ADR-76.
import type { CSSProperties } from 'react';
import type { ConsentText } from './consent';

const box: CSSProperties = {
  border: 'var(--border-hair) solid var(--color-border)',
  borderRadius: 'var(--radius)',
  padding: 'var(--space-4)',
  background: 'var(--color-surface-1)',
};

export function ConsentBlock({ text, checked, onChange }: { text: ConsentText; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={box}>
      <div className="t-body" style={{ color: 'var(--color-text)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>{text.title}</div>
      <ul style={{ margin: '0 0 var(--space-3)', paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {text.lines.map((l, i) => (
          <li key={i} className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{l}</li>
        ))}
      </ul>
      <label className="t-body" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', color: 'var(--color-text)' }}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18, flexShrink: 0 }} />
        {text.agree}
      </label>
    </div>
  );
}
