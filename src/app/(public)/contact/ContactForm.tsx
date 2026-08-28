'use client';
import { useState, useTransition } from 'react';
import type { CSSProperties } from 'react';
import { Button } from '@/core/ui';
import { submitContactAction } from './actions';

const input: CSSProperties = {
  width: '100%', minHeight: 'var(--tap-min)', padding: '0 var(--space-3)',
  borderRadius: 'var(--radius)', border: 'var(--border-hair) solid var(--color-border)',
  background: 'var(--color-surface-2)', color: 'var(--color-text)', font: 'inherit', fontSize: 15,
  marginTop: 'var(--space-1)',
};
const label: CSSProperties = { color: 'var(--color-text-secondary)', display: 'block' };

export function ContactForm({ defaultName = '', defaultEmail = '' }: { defaultName?: string; defaultEmail?: string }) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [body, setBody] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTx] = useTransition();
  const muted = { color: 'var(--color-text-secondary)' } as const;

  if (done) {
    return (
      <div className="ui-card" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
        <p className="t-body">보내 주셔서 고맙습니다. 운영자가 확인한 뒤 연락드리겠습니다.</p>
        {/* **오지 않을 메일을 약속하지 않는다.** 자동 회신 수단이 없다는 사실을 문장이 감추지 않는다. */}
        <p className="t-caption" style={{ ...muted, marginTop: 'var(--space-2)' }}>
          자동 회신은 가지 않습니다. 남겨 주신 연락처로 직접 답을 드립니다.
        </p>
      </div>
    );
  }

  return (
    <form
      style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-5)' }}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending || body.trim().length < 5) return;
        setErr(null);
        startTx(async () => {
          const res = await submitContactAction({ name, email, body });
          if (res.ok) setDone(true);
          else setErr(res.error);
        });
      }}
    >
      <label className="t-caption" style={label}>
        이름 (선택)
        <input style={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      </label>
      <label className="t-caption" style={label}>
        연락받으실 곳 (선택 · 이메일이나 전화)
        <input style={input} value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} />
      </label>
      <label className="t-caption" style={label}>
        문의 내용
        <textarea
          className="ui-textarea"
          style={{ ...input, minHeight: 140, padding: 'var(--space-3)' }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          required
        />
      </label>
      {err ? <p className="t-caption" style={muted}>{err}</p> : null}
      <Button type="submit" disabled={pending || body.trim().length < 5}>
        {pending ? '보내는 중…' : '보내기'}
      </Button>
    </form>
  );
}
