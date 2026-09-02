import { describe, expect, it } from 'vitest';
import { loginOutcome, LOGIN_HOME } from './loginOutcome';
import { HOLD_LOGIN_NOTICE } from '@/core/membershipVocab';

// ★ **표지가 붙었다**(ADR-173) — 세션이 서면 `/home?from=login` 으로 간다.
//   지키던 것은 **「홈으로 간다」**이지 쿼리 유무가 아니므로 그 뜻을 그대로 두고 값만 옮겨 적었다.
//   표지는 **상수로 읽는다** — 값을 손으로 박으면 한쪽만 고쳐지는 날 이 잠금이 거짓으로 초록이 된다.
describe('loginOutcome (로그인 결과 → 행로)', () => {
  it('세션 성립 시 전원 → /home (A′-1 통합 홈 — 역할 감금 해제·role 인자 제거)', () => {
    const o = loginOutcome({ error: null, hasSession: true });
    expect(o.redirect).toBe(LOGIN_HOME);
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

  it('returnTo 화이트리스트 통과 → 그 경로로(QR 왕복)', () => {
    expect(loginOutcome({ error: null, hasSession: true, returnTo: '/c/ABCD/1' }).redirect).toBe('/c/ABCD/1');
  });

  it('returnTo 오픈 리다이렉트 시도 → /home 으로 폴백(수용 11-a)', () => {
    expect(loginOutcome({ error: null, hasSession: true, returnTo: 'https://evil.example' }).redirect).toBe(LOGIN_HOME);
    expect(loginOutcome({ error: null, hasSession: true, returnTo: '/admin' }).redirect).toBe(LOGIN_HOME);
  });
});

describe('잠긴 계정 — 회원자격 보류 (ADR-152)', () => {
  // **최박사 확정**: 회원자격 보류는 강퇴이고 로그인 자체가 막힌다. 그때 우리 문구가 떠야 한다.
  //   `user_banned` 는 `@supabase/auth-js` 의 `ErrorCode` 에 실재한다(정본 확인 · 지어낸 값이 아니다).
  it('**`user_banned` 코드는 보류 문구로 번역된다** — 비밀번호 탓으로 뭉개지 않는다', () => {
    const out = loginOutcome({ error: { code: 'user_banned', message: 'User is banned' }, hasSession: false });
    expect(out.error).toBe(HOLD_LOGIN_NOTICE);
    expect(out.error, '이 문구가 뜨면 사람이 자기 비밀번호를 의심한다').not.toContain('비밀번호');
  });

  it('**코드가 없어도 메시지로 잡는다** — 다만 보조다', () => {
    expect(loginOutcome({ error: { message: 'User is banned' }, hasSession: false }).error).toBe(HOLD_LOGIN_NOTICE);
  });

  // **대조군** — 이것이 없으면 위 초록이 *모든 오류가 보류 문구* 여도 통과한다.
  it('보통 자격 오류는 그대로다(대조군)', () => {
    const out = loginOutcome({ error: { code: 'invalid_credentials', message: 'Invalid login credentials' }, hasSession: false });
    expect(out.error).toBe('이메일 또는 비밀번호를 확인해 주세요.');
    expect(out.error).not.toBe(HOLD_LOGIN_NOTICE);
  });

  it('성공 경로는 건드리지 않았다(대조군)', () => {
    expect(loginOutcome({ error: null, hasSession: true }).redirect).toBe(LOGIN_HOME);
  });
});
