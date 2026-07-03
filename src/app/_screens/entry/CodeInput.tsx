'use client';
// §7.1 코드 입력 — OtpInput 5칸. 5칸 미완성 시 확인 비활성.
import { useState } from 'react';
import { Button, OtpInput } from '@/core/ui';
import { AppHeader } from '../AppHeader';

export function CodeInput({ onSubmit, onExperience }: { onSubmit?: (code: string) => void; onExperience?: () => void }) {
  const [code, setCode] = useState('');
  return (
    <div>
      {/* 진입 스텝도 출구(홈) 제공 — 전진밖에 없는 화면 보완. sub=우상단 홈 아이콘(/home). 코드는 첫 스텝이라 뒤로 없음. */}
      <AppHeader variant="sub" title="참여 코드" />
      <p className="t-body-lg" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-6)' }}>
        인도자에게 받으신 5자리 코드를 입력해 주세요.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
        <OtpInput value={code} onChange={setCode} />
      </div>
      <Button onClick={() => onSubmit?.(code)} disabled={code.length !== 5} style={{ width: '100%' }}>
        확인
      </Button>
      {/* 체험 진단 진입(트랙 D-2) — 코드 입력 시도 후 '없음'을 깨닫는 지점. general 예약 차수로 합류(딥링크 동형). */}
      {onExperience ? (
        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-2)' }}>
            세미나 코드가 없으신가요? 체험 진단을 해보실 수 있어요.
          </p>
          <Button variant="ghost" onClick={onExperience} style={{ width: '100%' }}>
            체험 진단 시작하기
          </Button>
        </div>
      ) : null}
    </div>
  );
}
