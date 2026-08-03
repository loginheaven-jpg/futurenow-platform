import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Disclosure } from './Disclosure';

const render = (props: Partial<React.ComponentProps<typeof Disclosure>> = {}) =>
  renderToStaticMarkup(<Disclosure title="제목" {...props}>본문</Disclosure>);

describe('Disclosure — 헤더 규격(CC_GUIDE §3-2)', () => {
  it('줄 전체가 버튼이고 aria-expanded 가 상태와 일치한다', () => {
    expect(render()).toContain('aria-expanded="false"');
    expect(render({ defaultOpen: true })).toContain('aria-expanded="true"');
  });

  it('오른쪽 글자가 상태에 따라 바뀐다 — 아이콘만으로는 상태를 알려 주지 못한다', () => {
    expect(render()).toContain('펼치기');
    expect(render()).not.toContain('접기');
    expect(render({ defaultOpen: true })).toContain('접기');
  });

  it('data-open 이 상태를 실어 CSS 가 꺾쇠 회전·하단 hairline 을 건다', () => {
    expect(render()).toContain('data-open="false"');
    expect(render({ defaultOpen: true })).toContain('data-open="true"');
  });

  it('요약 줄은 준 경우에만 나온다', () => {
    expect(render()).not.toContain('ui-disc__summary');
    expect(render({ summary: '가 · 나' })).toContain('가 · 나');
  });

  it("'선택' 뱃지는 준 경우에만 나온다 — 접힘 블록은 접힘 자체가 신호라 두지 않는다(ADR-82)", () => {
    expect(render()).not.toContain('ui-disc__badge');
    expect(render({ badge: '선택' })).toContain('선택');
  });

  it('마지막 블록이면 아래 여백을 0 으로(면 끝 처리)', () => {
    expect(render()).not.toContain('ui-disc--last');
    expect(render({ last: true })).toContain('ui-disc--last');
  });

  it('본문은 접혀 있어도 DOM 에 남는다 — 인쇄 규칙이 생기면 강제 표시할 수 있게', () => {
    expect(render()).toContain('본문');
  });

  it('문안을 갖지 않는다 — 제목·요약·뱃지는 전부 호출부가 준다', () => {
    const html = render({ title: 'ZZ제목', summary: 'ZZ요약', badge: 'ZZ뱃지' });
    expect(html).toContain('ZZ제목');
    expect(html).toContain('ZZ요약');
    expect(html).toContain('ZZ뱃지');
  });
});
