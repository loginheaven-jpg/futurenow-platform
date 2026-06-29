import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccountForm } from './AccountForm';

const noop = () => {};
const render = (over: Partial<Parameters<typeof AccountForm>[0]> = {}) =>
  renderToStaticMarkup(
    <AccountForm
      name="홍길동"
      phone="010-1234-5678"
      pw1=""
      pw2=""
      busy={null}
      onName={noop}
      onPhone={noop}
      onPw1={noop}
      onPw2={noop}
      onSaveName={noop}
      onSavePhone={noop}
      onSavePassword={noop}
      {...over}
    />,
  );

describe('AccountForm (내 정보)', () => {
  const html = render();

  it('이름·전화 prefill + 비번 2회 + 섹션별 저장', () => {
    expect(html).toContain('value="홍길동"');
    expect(html).toContain('value="010-1234-5678"');
    expect((html.match(/type="password"/g) ?? []).length).toBe(2);
    expect(html).toContain('이름 저장');
    expect(html).toContain('전화번호 저장');
    expect(html).toContain('비밀번호 변경');
  });

  it('안전: role 쓰기 경로 0(역할 입력·표시 없음)', () => {
    expect(html).not.toContain('역할');
    expect(html).not.toMatch(/name="role"|>관리자<|"admin"/);
  });
});
