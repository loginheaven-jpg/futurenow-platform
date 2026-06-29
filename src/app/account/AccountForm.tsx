'use client';
// 내 정보 폼(프레젠테이션 — 부수효과 없음). 이름·전화·비밀번호 세 섹션, 각자 저장.
// **role 입력·표시 없음**(2.S2 봉쇄 — 계정 화면에 role 쓰기 경로 0). 시스템 영역이라 의미색 절제, 피드백은 토스트.
import { type CSSProperties } from 'react';
import { Button } from '@/core/ui';

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
  marginTop: 'var(--space-1)',
};
const section: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
  padding: 'var(--space-4)',
  background: 'var(--color-surface-1)',
  border: 'var(--border-hair) solid var(--color-border)',
  borderRadius: 'var(--radius)',
};

export type AccountBusy = 'name' | 'phone' | 'pw' | null;

export function AccountForm({
  name,
  phone,
  pw1,
  pw2,
  busy,
  onName,
  onPhone,
  onPw1,
  onPw2,
  onSaveName,
  onSavePhone,
  onSavePassword,
}: {
  name: string;
  phone: string;
  pw1: string;
  pw2: string;
  busy: AccountBusy;
  onName: (v: string) => void;
  onPhone: (v: string) => void;
  onPw1: (v: string) => void;
  onPw2: (v: string) => void;
  onSaveName: () => void;
  onSavePhone: () => void;
  onSavePassword: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* 이름 */}
      <section style={section}>
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          이름
          <input style={inputStyle} type="text" autoComplete="name" placeholder="표시할 이름" value={name} onChange={(e) => onName(e.target.value)} />
        </label>
        <Button onClick={onSaveName} disabled={busy === 'name'} style={{ alignSelf: 'flex-start' }}>
          {busy === 'name' ? '저장 중…' : '이름 저장'}
        </Button>
      </section>

      {/* 전화 */}
      <section style={section}>
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          전화번호
          <input style={inputStyle} type="tel" autoComplete="tel" placeholder="010-0000-0000" value={phone} onChange={(e) => onPhone(e.target.value)} />
        </label>
        <p className="t-caption" style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          전화번호는 인도자 연락에만 쓰여요. 본인과 운영자만 볼 수 있어요.
        </p>
        <Button onClick={onSavePhone} disabled={busy === 'phone'} style={{ alignSelf: 'flex-start' }}>
          {busy === 'phone' ? '저장 중…' : '전화번호 저장'}
        </Button>
      </section>

      {/* 비밀번호 변경(로그인 상태) */}
      <section style={section}>
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          새 비밀번호
          <input style={inputStyle} type="password" autoComplete="new-password" placeholder="6자 이상" value={pw1} onChange={(e) => onPw1(e.target.value)} />
        </label>
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          새 비밀번호 확인
          <input style={inputStyle} type="password" autoComplete="new-password" placeholder="다시 입력" value={pw2} onChange={(e) => onPw2(e.target.value)} />
        </label>
        <Button onClick={onSavePassword} disabled={busy === 'pw' || !pw1 || !pw2} style={{ alignSelf: 'flex-start' }}>
          {busy === 'pw' ? '바꾸는 중…' : '비밀번호 변경'}
        </Button>
      </section>
    </div>
  );
}
