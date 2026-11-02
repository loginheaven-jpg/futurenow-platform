import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WishPair } from './WishPair';

describe('WishPair (ADR-204 — 두 시점의 바람)', () => {
  it('승인 제목·두 머리 아래에 사전·사후 원문을 순서대로 표시한다', () => {
    const html = renderToStaticMarkup(<WishPair before="관계를 더 돌보고 싶다" after="매주 안부를 전하고 있다" />);
    expect(html).toContain('>6주 전의 바람과 지금</h3>');
    expect(html).toContain('>세미나 전 · 바란 것</h4>');
    expect(html).toContain('>마친 뒤 · 그 바람은 지금</h4>');
    const order = ['세미나 전 · 바란 것', '관계를 더 돌보고 싶다', '마친 뒤 · 그 바람은 지금', '매주 안부를 전하고 있다'];
    const positions = order.map((text) => html.indexOf(text));
    expect(positions.every((at) => at >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it.each([
    { before: '', after: '사후 글' },
    { before: '사전 글', after: '' },
    { before: ' \n\t ', after: '사후 글' },
    { before: '사전 글', after: '\n　 ' },
    { before: '', after: '' },
  ])('어느 한쪽이라도 빈 글이면 카드 전체를 숨긴다: %j', (props) => {
    expect(renderToStaticMarkup(<WishPair {...props} />)).toBe('');
  });

  it('표시 여부만 trim으로 판단하고 줄바꿈을 포함한 원문은 보존한다', () => {
    const html = renderToStaticMarkup(<WishPair before={' 첫 문장\n다음 문장 '} after={' 마친 뒤의 글 '} />);
    expect(html).toContain(' 첫 문장\n다음 문장 ');
    expect(html).toContain(' 마친 뒤의 글 ');
    expect(html).toContain('white-space:pre-line');
  });

  it('입력 글을 HTML로 해석하지 않는다', () => {
    const html = renderToStaticMarkup(<WishPair before="<script>실행하지 않음</script>" after="<b>강조 태그도 원문</b>" />);
    expect(html).toContain('&lt;script&gt;실행하지 않음&lt;/script&gt;');
    expect(html).toContain('&lt;b&gt;강조 태그도 원문&lt;/b&gt;');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>');
  });
});
