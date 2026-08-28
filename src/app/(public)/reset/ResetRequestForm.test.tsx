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
    // **U-4 §5 — 현관 복귀는 화면이 아니라 껍데기 로고가 든다.** 단언을 지우지 않고 뜻을 옮겼다:
    //   ⑴ 여기서는 *화면이 더는 그리지 않는다* 를 잠근다(로고와 겹치던 자리다)
    //   ⑵ *현관에 닿는다* 는 `join/joinChrome.test.ts` 가 든다 — 걷기 전 **4폭 실브라우저 실측**으로
    //      로고가 이 화면에서 실제로 보이고 목적지가 같은 `/` 임을 확인했다.
    expect(html, '「처음으로」가 되살아났다 — 로고와 겹친다').not.toContain('>처음으로<');
  });

  it('제출 후: 동일 안내 노출, 이메일 폼 숨김(enumeration 방지)', () => {
    const html = render({ notice: '입력하신 주소로 메일을 보냈어요. 받은 링크로 비밀번호를 다시 설정해 주세요.' });
    expect(html).toContain('메일을 보냈어요');
    expect(html).not.toContain('재설정 링크 받기'); // 폼 버튼 숨김 — 결과로 문구 가르지 않음
  });
});
