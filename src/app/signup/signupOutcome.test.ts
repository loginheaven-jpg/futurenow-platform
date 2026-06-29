import { describe, expect, it } from 'vitest';
import { signupOutcome } from './signupOutcome';

describe('signupOutcome (가입 결과 → 행로)', () => {
  it('세션 반환(확인 off) → 홈', () => {
    expect(signupOutcome({ error: null, hasSession: true }).redirect).toBe('/');
  });

  it('세션 없음(확인 필요) → 안내, redirect 없음', () => {
    const o = signupOutcome({ error: null, hasSession: false });
    expect(o.notice).toBeTruthy();
    expect(o.redirect).toBeUndefined();
  });

  it('오류 → 담담한 에러', () => {
    const o = signupOutcome({ error: { message: 'User already registered' }, hasSession: false });
    expect(o.error).toBeTruthy();
    expect(o.redirect).toBeUndefined();
    expect(o.notice).toBeUndefined();
  });
});
