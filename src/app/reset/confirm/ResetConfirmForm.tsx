'use client';
// 새 비밀번호 설정 폼(프레젠테이션 — 부수효과 없음). 상태(phase)별 렌더:
//   checking(세션 확인 중) · expired(복구 세션 없음 → 재요청) · ready(비번 2회 입력) · done(성공).
// 복구 세션 게이트: phase='ready' 일 때만 비번 입력 노출 — 세션 없이 변경 불가(Client 가 phase 결정).
import { type CSSProperties } from 'react';
import Link from 'next/link';
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
};

export type ResetPhase = 'checking' | 'expired' | 'ready' | 'done';

export function ResetConfirmForm({
  phase,
  pw1,
  pw2,
  busy,
  error,
  onPw1,
  onPw2,
  onSubmit,
  onContinue,
}: {
  phase: ResetPhase;
  pw1: string;
  pw2: string;
  busy: boolean;
  error: string | null;
  onPw1: (v: string) => void;
  onPw2: (v: string) => void;
  onSubmit: () => void;
  onContinue: () => void;
}) {
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <h1 className="t-h1" style={{ color: 'var(--color-primary)', fontSize: 22, margin: '0 0 var(--space-4)' }}>새 비밀번호 설정</h1>

      {phase === 'checking' ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }} aria-busy="true">확인 중…</p>
      ) : null}

      {phase === 'expired' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            링크가 만료됐거나 유효하지 않아요. 재설정을 다시 요청해 주세요.
          </p>
          <a className="ui-btn ui-btn--primary" href="/reset" style={{ width: '100%', textDecoration: 'none' }}>재설정 다시 요청</a>
        </div>
      ) : null}

      {phase === 'ready' ? (
        <>
          {error ? <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>{error}</p> : null}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
          >
            <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
              새 비밀번호
              <input style={{ ...inputStyle, marginTop: 'var(--space-1)' }} type="password" autoComplete="new-password" placeholder="6자 이상" value={pw1} onChange={(e) => onPw1(e.target.value)} />
            </label>
            <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
              새 비밀번호 확인
              <input style={{ ...inputStyle, marginTop: 'var(--space-1)' }} type="password" autoComplete="new-password" placeholder="다시 입력" value={pw2} onChange={(e) => onPw2(e.target.value)} />
            </label>
            <Button type="submit" disabled={!pw1 || !pw2 || busy} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
              {busy ? '바꾸는 중…' : '비밀번호 변경'}
            </Button>
          </form>
        </>
      ) : null}

      {phase === 'done' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>비밀번호를 바꿨어요.</p>
          <Button onClick={onContinue} style={{ width: '100%' }}>계속하기</Button>
        </div>
      ) : null}

      {/* 출구 — 어느 단계에서도 로그인·현관으로 나갈 수 있게(A′-3) */}
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-6)', textAlign: 'center' }}>
        <a href="/login" style={{ color: 'var(--color-primary)' }}>로그인</a>
        {' · '}
        <Link href="/" style={{ color: 'var(--color-text-secondary)' }}>처음으로</Link>
      </p>
    </div>
  );
}
