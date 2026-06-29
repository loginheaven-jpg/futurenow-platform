import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import GlobalError from './global-error';

describe('global-error (루트 대체 — html/body·민감정보 비노출)', () => {
  const secret = 'SECRET_root_xyz';
  const err = Object.assign(new Error(secret), { digest: 'gd_999', stack: 'ROOT_STACK' });
  const html = renderToStaticMarkup(<GlobalError error={err} reset={() => {}} />);

  it('자체 html/body + 담담한 카피 + 다시 시도', () => {
    expect(html).toContain('<html');
    expect(html).toContain('<body');
    expect(html).toContain('잠시 문제가 생겼어요');
    expect(html).toContain('다시 시도');
  });

  it('스택·message·digest 비노출', () => {
    expect(html).not.toContain(secret);
    expect(html).not.toContain('ROOT_STACK');
    expect(html).not.toContain('gd_999');
  });
});
