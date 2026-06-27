'use client';
// §7.3 로그인/가입 — '들어가기' 시점 인증. 신규=가입·기존=로그인 분기. 가입 최소화, 이름·전화 강요 금지(ADR-03).
import { useState, type CSSProperties, type ReactNode } from 'react';
import { Button } from '@/core/ui';
import { AppHeader } from '../AppHeader';

const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: 'var(--tap-min)',
  padding: '0 var(--space-3)',
  borderRadius: 'var(--radius)',
  border: 'var(--border-hair) solid var(--color-border)',
  background: 'var(--color-surface-2)',
  color: 'var(--color-text)',
  font: 'inherit',
  fontSize: 15,
};

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="t-body"
      style={{
        flex: 1,
        minHeight: 'var(--tap-min)',
        borderRadius: 'var(--radius)',
        border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: active ? 'var(--color-surface-1)' : 'transparent',
        color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

export function AuthGate({ onContinue }: { onContinue?: () => void }) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  return (
    <div>
      <AppHeader title="들어가기" />
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        <TabBtn active={mode === 'signup'} onClick={() => setMode('signup')}>처음이에요</TabBtn>
        <TabBtn active={mode === 'login'} onClick={() => setMode('login')}>계정이 있어요</TabBtn>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <input style={inputStyle} type="email" placeholder="이메일" aria-label="이메일" />
        <input style={inputStyle} type="password" placeholder="비밀번호" aria-label="비밀번호" />
      </div>
      <Button onClick={onContinue} style={{ width: '100%', marginBottom: 'var(--space-3)' }}>
        {mode === 'signup' ? '가입하고 들어가기' : '로그인'}
      </Button>
      <Button variant="ghost" onClick={onContinue} style={{ width: '100%' }}>구글로 계속</Button>
      <p className="t-caption" style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-4)', textAlign: 'center' }}>
        이름·전화번호는 받지 않습니다. 진단에 필요한 것만 묻습니다.
      </p>
    </div>
  );
}
