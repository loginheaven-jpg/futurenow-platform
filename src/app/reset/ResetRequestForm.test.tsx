import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ResetRequestForm } from './ResetRequestForm';

const noop = () => {};
const render = (over: Partial<Parameters<typeof ResetRequestForm>[0]> = {}) =>
  renderToStaticMarkup(<ResetRequestForm email="" busy={false} notice={null} onEmail={noop} onSubmit={noop} {...over} />);

describe('ResetRequestForm (재설정 요청)', () => {
  it('요청 전: 이메일 폼 + /login 링크', () => {
    const html = render();
    expect(html).toContain('이메일');
    expect(html).toContain('재설정 링크 받기');
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/"'); // 현관 복귀(A′-3)
  });

  it('제출 후: 동일 안내 노출, 이메일 폼 숨김(enumeration 방지)', () => {
    const html = render({ notice: '입력하신 주소로 메일을 보냈어요. 받은 링크로 비밀번호를 다시 설정해 주세요.' });
    expect(html).toContain('메일을 보냈어요');
    expect(html).not.toContain('재설정 링크 받기'); // 폼 버튼 숨김 — 결과로 문구 가르지 않음
  });
});
