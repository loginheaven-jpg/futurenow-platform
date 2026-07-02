import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CodeInput } from './CodeInput';

const noop = () => {};

describe('CodeInput — 체험 진입(D-2)', () => {
  it('onExperience 전달 시 체험 진입 요소 노출', () => {
    const html = renderToStaticMarkup(<CodeInput onSubmit={noop} onExperience={noop} />);
    expect(html).toContain('체험 진단 시작하기');
    expect(html).toContain('세미나 코드가 없으신가요');
  });

  it('onExperience 미전달 시 체험 진입 요소 미노출(세미나 코드 입력창 무변경)', () => {
    const html = renderToStaticMarkup(<CodeInput onSubmit={noop} />);
    expect(html).not.toContain('체험 진단 시작하기');
    expect(html).toContain('5자리 코드'); // 기존 세미나 코드 안내는 유지
  });
});
