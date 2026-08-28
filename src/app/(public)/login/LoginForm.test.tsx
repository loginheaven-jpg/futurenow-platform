import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LoginForm } from './LoginForm';

const noop = () => {};
const render = (over: Partial<Parameters<typeof LoginForm>[0]> = {}) =>
  renderToStaticMarkup(
    <LoginForm
      email=""
      password=""
      show={false}
      busy={false}
      error={null}
      onEmail={noop}
      onPassword={noop}
      onToggleShow={noop}
      onSubmit={noop}
      {...over}
    />,
  );

describe('LoginForm (로그인 전용 — 가입 폼 없음)', () => {
  it('이메일·비밀번호·로그인 버튼을 렌더', () => {
    const html = render();
    expect(html).toContain('이메일');
    expect(html).toContain('비밀번호');
    expect(html).toContain('로그인');
    expect(html).toContain('type="submit"');
  });

  it('가입 폼/탭이 없다(로그인 전용 — 가입은 /signup 링크로만)', () => {
    const html = render();
    // 가입 FORM/탭 지표 부재(이름·비밀번호 입력 묶음·탭). '가입하기' 버튼·구버전 탭 없음.
    expect(html).not.toMatch(/처음이에요|가입하고 들어가기|구글로 계속|가입하기/);
  });

  it('참여자 안내 + /join 링크, /signup·/reset 상호 링크', () => {
    const html = render();
    expect(html).toContain('받은 코드');
    expect(html).toContain('href="/join"');
    expect(html).toContain('href="/signup"'); // 로그인 ↔ 가입
    expect(html).toContain('href="/reset"'); // 비밀번호 재설정
    // **U-4 §5 — 현관 복귀는 화면이 아니라 껍데기 로고가 든다.** 단언을 지우지 않고 뜻을 옮겼다:
    //   ⑴ 여기서는 *화면이 더는 그리지 않는다* 를 잠근다(로고와 겹치던 자리다)
    //   ⑵ *현관에 닿는다* 는 `join/joinChrome.test.ts` 가 든다 — 걷기 전 **4폭 실브라우저 실측**으로
    //      로고가 이 화면에서 실제로 보이고 목적지가 같은 `/` 임을 확인했다.
    expect(html, '「처음으로」가 되살아났다 — 로고와 겹친다').not.toContain('>처음으로<');
  });

  it('에러는 담담한 카피로 표시(의미색 토큰 없음)', () => {
    const html = render({ error: '이메일 또는 비밀번호를 확인해 주세요.' });
    expect(html).toContain('이메일 또는 비밀번호를 확인해 주세요.');
    expect(html).not.toMatch(/--care|--danger|--warning/);
  });
});
