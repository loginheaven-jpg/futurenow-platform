import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthGate } from './AuthGate';

const noop = () => {};

describe('AuthGate — 이중 제출 가드(busy)', () => {
  it('busy: [처리 중…] 표시(중복 제출 차단 신호)', () => {
    const html = renderToStaticMarkup(<AuthGate onSubmit={noop} busy />);
    expect(html).toContain('처리 중…');
  });

  it('정상: 가입 라벨', () => {
    const html = renderToStaticMarkup(<AuthGate onSubmit={noop} />);
    expect(html).toContain('가입하고 들어가기');
    expect(html).not.toContain('처리 중');
  });
});
