import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SignupForm } from './SignupForm';

const noop = () => {};
const render = (over: Partial<Parameters<typeof SignupForm>[0]> = {}) =>
  renderToStaticMarkup(
    <SignupForm
      email=""
      password=""
      name=""
      show={false}
      busy={false}
      error={null}
      notice={null}
      onEmail={noop}
      onPassword={noop}
      onName={noop}
      onToggleShow={noop}
      onSubmit={noop}
      {...over}
    />,
  );

describe('SignupForm (표준 회원가입)', () => {
  it('이메일·이름(선택)·비밀번호·가입 버튼', () => {
    const html = render();
    expect(html).toContain('이메일');
    expect(html).toContain('이름');
    expect(html).toContain('비밀번호');
    expect(html).toContain('가입하기');
    expect(html).toContain('type="submit"');
  });

  it('/login 상호 링크', () => {
    expect(render()).toContain('href="/login"');
  });

  it('확인 안내(notice)를 담담하게 표시(의미색 0)', () => {
    const html = render({ notice: '가입을 마치려면 이메일을 확인해 주세요.' });
    expect(html).toContain('이메일을 확인해 주세요');
    expect(html).not.toMatch(/--care|--danger|--warning/);
  });
});
