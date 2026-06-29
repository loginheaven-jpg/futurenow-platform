import { describe, expect, it } from 'vitest';
import { loginOutcome } from './loginOutcome';

describe('loginOutcome (로그인 결과 → 행로)', () => {
  it('코치·운영자 → /coach', () => {
    expect(loginOutcome({ error: null, hasSession: true, role: 'coach' }).redirect).toBe('/coach');
    expect(loginOutcome({ error: null, hasSession: true, role: 'admin' }).redirect).toBe('/coach');
  });

  it('멤버(user) → /home (자기 홈)', () => {
    const o = loginOutcome({ error: null, hasSession: true, role: 'user' });
    expect(o.redirect).toBe('/home');
    expect(o.error).toBeUndefined();
  });

  it('자격 오류 → 담담한 에러, redirect 없음', () => {
    const o = loginOutcome({ error: { message: 'Invalid login credentials' }, hasSession: false, role: null });
    expect(o.error).toBe('이메일 또는 비밀번호를 확인해 주세요.');
    expect(o.redirect).toBeUndefined();
  });

  it('세션 없음(이메일 미확인 등) → 에러', () => {
    expect(loginOutcome({ error: null, hasSession: false, role: null }).error).toBeTruthy();
  });
});
