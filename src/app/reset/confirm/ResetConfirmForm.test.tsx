import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ResetConfirmForm, type ResetPhase } from './ResetConfirmForm';

const noop = () => {};
const render = (phase: ResetPhase, over: Partial<Parameters<typeof ResetConfirmForm>[0]> = {}) =>
  renderToStaticMarkup(
    <ResetConfirmForm phase={phase} pw1="" pw2="" busy={false} error={null} onPw1={noop} onPw2={noop} onSubmit={noop} onContinue={noop} {...over} />,
  );

describe('ResetConfirmForm (새 비밀번호 — 복구 세션 게이트)', () => {
  it('ready: 비밀번호 2회 입력 + 변경 버튼 + 로그인·현관 출구(A′-3)', () => {
    const html = render('ready');
    expect((html.match(/type="password"/g) ?? []).length).toBe(2);
    expect(html).toContain('비밀번호 변경');
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/"'); // 현관 복귀
  });

  it('expired: 비밀번호 입력 없음(게이트) + 재요청 링크 /reset', () => {
    const html = render('expired');
    expect(html).not.toContain('type="password"'); // 복구 세션 없으면 비번 변경 불가
    expect(html).toContain('href="/reset"');
    expect(html).toContain('만료');
  });

  it('checking: 확인 중(입력 없음)', () => {
    const html = render('checking');
    expect(html).not.toContain('type="password"');
    expect(html).toContain('확인 중');
  });

  it('done: 성공 안내 + 계속하기', () => {
    const html = render('done');
    expect(html).toContain('바꿨어요');
    expect(html).toContain('계속하기');
    expect(html).not.toContain('type="password"');
  });

  it('error 는 정제 메시지로 표시(raw 원문 아님)', () => {
    const html = render('ready', { error: '두 비밀번호가 일치하지 않아요.' });
    expect(html).toContain('일치하지 않아요');
  });
});
