'use client';
// 비밀번호 재설정 요청 폼(프레젠테이션 — 부수효과 없음). 제출 후 항상 동일 안내(enumeration 방지)는 Client 가 주입.
// 참여자 팔레트·중립. /login 보조 링크는 일반 앵커(라우터 컨텍스트 불요 → 렌더 테스트 가능).
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

export function ResetRequestForm({
  email,
  busy,
  notice,
  onEmail,
  onSubmit,
}: {
  email: string;
  busy: boolean;
  notice: string | null;
  onEmail: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <h1 className="t-h1" style={{ color: 'var(--color-primary)', fontSize: 22, margin: '0 0 var(--space-2)' }}>비밀번호 재설정</h1>

      {notice ? (
        // 제출 후: 계정 존재 여부와 무관하게 동일 안내(enumeration 방지).
        <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0 var(--space-6)' }}>{notice}</p>
      ) : (
        <>
          <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-6)' }}>
            가입하신 이메일로 재설정 링크를 보내드려요.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
          >
            <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
              이메일
              <input
                style={{ ...inputStyle, marginTop: 'var(--space-1)' }}
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => onEmail(e.target.value)}
              />
            </label>
            <Button type="submit" disabled={!email || busy} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
              {busy ? '보내는 중…' : '재설정 링크 받기'}
            </Button>
          </form>
        </>
      )}

      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-6)', textAlign: 'center' }}>
        <a href="/login" style={{ color: 'var(--color-primary)' }}>로그인으로 돌아가기</a>
        {' · '}
        <Link href="/" style={{ color: 'var(--color-text-secondary)' }}>처음으로</Link>
      </p>
    </div>
  );
}
