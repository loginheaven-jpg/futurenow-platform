'use client';
// §7.1 코드 입력 — OtpInput 5칸. 5칸 미완성 시 확인 비활성.
import { useState } from 'react';
import { Button, OtpInput } from '@/core/ui';
import { AppHeader } from '../AppHeader';

export function CodeInput({ onSubmit }: { onSubmit?: (code: string) => void }) {
  const [code, setCode] = useState('');
  return (
    <div>
      <AppHeader variant="flow" title="참여 코드" />
      <p className="t-body-lg" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-6)' }}>
        인도자에게 받으신 5자리 코드를 입력해 주세요.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
        <OtpInput value={code} onChange={setCode} />
      </div>
      <Button onClick={() => onSubmit?.(code)} disabled={code.length !== 5} style={{ width: '100%' }}>
        확인
      </Button>
    </div>
  );
}
