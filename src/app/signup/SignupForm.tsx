'use client';
// 표준 회원가입 폼(프레젠테이션 — 부수효과 없음). 스태프·일반 멤버용(참여자 코드 가입은 /join 별도).
// 참여자 팔레트·중립. 보조 링크는 일반 앵커(라우터 컨텍스트 불요 → 렌더 테스트 가능).
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
};

export function SignupForm({
  email,
  password,
  name,
  show,
  busy,
  error,
  notice,
  onEmail,
  onPassword,
  onName,
  onToggleShow,
  onSubmit,
}: {
  email: string;
  password: string;
  name: string;
  show: boolean;
  busy: boolean;
  error: string | null;
  notice: string | null;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onName: (v: string) => void;
  onToggleShow: () => void;
  onSubmit: () => void;
}) {
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <h1 className="t-h1" style={{ color: 'var(--color-primary)', fontSize: 22, margin: '0 0 var(--space-2)' }}>회원가입</h1>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-6)' }}>
        코치·스태프 계정을 만들어요.
      </p>

      {error ? <p className="t-caption" style={{ color: 'var(--color-text-muted)', margin: '0 0 var(--space-4)' }}>{error}</p> : null}
      {notice ? <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>{notice}</p> : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          이메일
          <input style={{ ...inputStyle, marginTop: 'var(--space-1)' }} type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => onEmail(e.target.value)} />
        </label>
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          이름 <span style={{ color: 'var(--color-text-muted)' }}>(선택)</span>
          <input style={{ ...inputStyle, marginTop: 'var(--space-1)' }} type="text" autoComplete="name" placeholder="표시할 이름" value={name} onChange={(e) => onName(e.target.value)} />
        </label>
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          비밀번호
          <input style={{ ...inputStyle, marginTop: 'var(--space-1)' }} type={show ? 'text' : 'password'} autoComplete="new-password" placeholder="6자 이상" value={password} onChange={(e) => onPassword(e.target.value)} />
          <button type="button" onClick={onToggleShow} className="t-caption" style={{ marginTop: 'var(--space-1)', background: 'transparent', border: 0, color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 0 }}>
            {show ? '비밀번호 숨기기' : '비밀번호 보기'}
          </button>
        </label>

        <Button type="submit" disabled={!email || !password || busy} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
          {busy ? '가입 중…' : '가입하기'}
        </Button>
      </form>

      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-6)', textAlign: 'center' }}>
        이미 계정이 있으신가요? <a href="/login" style={{ color: 'var(--color-primary)' }}>로그인</a>
      </p>
    </div>
  );
}
