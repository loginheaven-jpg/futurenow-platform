import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CodeInput } from './CodeInput';
import { TOOL } from '@/app/_vocab/tool';

const noop = () => {};

describe('CodeInput — 체험 진입(D-2)', () => {
  it('onExperience 전달 시 체험 진입 요소 노출', () => {
    const html = renderToStaticMarkup(<CodeInput onSubmit={noop} onExperience={noop} />);
    expect(html).toContain(`${TOOL.trial} 시작하기`);
    expect(html).toContain('세미나 코드가 없으신가요');
  });

  // **U-4 §1 — 이 부품은 헤더를 그리지 않는다.** 단언을 지우지 않고 옮겼다:
  //   *출구가 있는가* 는 `(public)/join/joinChrome.test.ts` 가 든다(다섯 단계 `sub` 잠금).
  //   여기서는 **그리지 않는다**를 잠근다 — 되살아나면 껍데기와 겹쳐 헤더가 두 줄이 된다.
  it('헤더를 그리지 않는다 — 껍데기가 그리는 자리다', () => {
    const html = renderToStaticMarkup(<CodeInput onSubmit={noop} />);
    expect(html).not.toContain('<header');
  });

  it('onExperience 미전달 시 체험 진입 요소 미노출(세미나 코드 입력창 무변경)', () => {
    const html = renderToStaticMarkup(<CodeInput onSubmit={noop} />);
    expect(html).not.toContain(`${TOOL.trial} 시작하기`);
    expect(html).toContain('5자리 코드'); // 기존 세미나 코드 안내는 유지
  });
});
