import { describe, expect, it } from 'vitest';
import { loginOutcome } from './loginOutcome';

describe('loginOutcome (로그인 결과 → 행로)', () => {
  it('세션 성립 시 전원 → /home (A′-1 통합 홈 — 역할 감금 해제·role 인자 제거)', () => {
    const o = loginOutcome({ error: null, hasSession: true });
    expect(o.redirect).toBe('/home');
    expect(o.error).toBeUndefined();
  });

  it('자격 오류 → 담담한 에러, redirect 없음', () => {
    const o = loginOutcome({ error: { message: 'Invalid login credentials' }, hasSession: false });
    expect(o.error).toBe('이메일 또는 비밀번호를 확인해 주세요.');
    expect(o.redirect).toBeUndefined();
  });

  it('세션 없음(이메일 미확인 등) → 에러', () => {
    expect(loginOutcome({ error: null, hasSession: false }).error).toBeTruthy();
  });
});
