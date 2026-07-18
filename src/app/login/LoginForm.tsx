'use client';
// 로그인 폼(프레젠테이션 — 부수효과 없음). 로그인 전용(가입 폼·탭 없음). **전 역할 공용**(참여자·인도자·운영자) — 로그인 후 역할별 착지.
// 참여자 팔레트(네이비 틀·중립). 의미색 불필요. 보조 링크는 일반 앵커(라우터 컨텍스트 불요 → 렌더 테스트 가능).
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

export function LoginForm({
  email,
  password,
  show,
  busy,
  error,
  onEmail,
  onPassword,
  onToggleShow,
  onSubmit,
}: {
  email: string;
  password: string;
  show: boolean;
  busy: boolean;
  error: string | null;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onToggleShow: () => void;
  onSubmit: () => void;
}) {
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <h1 className="t-h1" style={{ color: 'var(--color-primary)', fontSize: 22, margin: '0 0 var(--space-2)' }}>
        퓨처나우 · 로그인
      </h1>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-6)' }}>
        이미 가입하셨다면 이메일과 비밀번호로 로그인하세요. 참여자·인도자 모두 이곳에서 들어옵니다.
      </p>

      {error ? (
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>{error}</p>
      ) : null}

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
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          비밀번호
          <input
            style={{ ...inputStyle, marginTop: 'var(--space-1)' }}
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => onPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={onToggleShow}
            className="t-caption"
            style={{ marginTop: 'var(--space-1)', background: 'transparent', border: 0, color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 0 }}
          >
            {show ? '비밀번호 숨기기' : '비밀번호 보기'}
          </button>
        </label>

        <Button type="submit" disabled={!email || !password || busy} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
          {busy ? '로그인 중…' : '로그인'}
        </Button>
      </form>

      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-6)', textAlign: 'center' }}>
        {/* 이메일 리셋 발송이 안정화될 때까지 운영자 카톡 리셋을 안내. '비밀번호'에는 테스트용으로 기존 이메일 리셋 링크(/reset) 유지. */}
        <a href="/reset" style={{ color: 'var(--color-primary)' }}>비밀번호</a>를 잊으신 분은 운영자에게 카톡으로 리셋을 요청해 주십시오.
      </p>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)', textAlign: 'center' }}>
        처음 참여하시나요? 인도자에게 받은 코드로{' '}
        <a href="/join" style={{ color: 'var(--color-primary)' }}>입장하기</a>
      </p>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)', textAlign: 'center' }}>
        인도자로 활동하실 분은 <a href="/signup" style={{ color: 'var(--color-primary)' }}>인도자 회원가입</a>
      </p>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-4)', textAlign: 'center' }}>
        <Link href="/" style={{ color: 'var(--color-text-secondary)' }}>처음으로</Link>
      </p>
    </div>
  );
}
