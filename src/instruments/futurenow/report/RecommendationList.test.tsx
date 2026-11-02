import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RecommendationList } from './RecommendationList';

const items = [
  { text: ' 첫 번째 글\n두 번째 줄 ', attribution: '남·30대' },
  { text: '다음 분에게 전할 다른 글', attribution: '참여자' },
];

describe('RecommendationList (ADR-205)', () => {
  it('승인 제목·안내·운영 문구와 동의 목록의 원문·표기만 표시한다', () => {
    const html = renderToStaticMarkup(<RecommendationList items={items} unconsentedCount={2} />);
    expect(html).toContain('추천의 말 · 모집 안내용');
    expect(html).toContain('게재에 동의한 글만 싣습니다. 표기는 성별·연령대입니다.');
    expect(html).toContain('싣기 전에 본문에 실명이나 개인 사정이 담겼는지 확인해 주세요. 게재를 거두고 싶다는 요청이 오면 그 글은 쓰지 않습니다.');
    expect(html).toContain('동의하지 않은 글 2건은 싣지 않았습니다.');
    for (const item of items) {
      expect(html).toContain(item.text);
      expect(html).toContain(`(${item.attribution})`);
    }
    expect(html).not.toContain('복사됨 ✓');
  });

  it('복사 버튼만 인쇄에서 제외하며 화면과 인쇄에 같은 한 목록을 쓴다', () => {
    const html = renderToStaticMarkup(<RecommendationList items={items} unconsentedCount={0} />);
    expect(html.match(/<button /g)).toHaveLength(3);
    expect(html.match(/<button[^>]*class="[^"]*no-print[^"]*"/g)).toHaveLength(3);
    expect(html.match(/no-print/g)).toHaveLength(3);
    expect(html.match(/<ol /g)).toHaveLength(1);
    expect(html.match(/<blockquote /g)).toHaveLength(items.length);
    expect(html).toContain('모두 복사');
    expect(html).not.toContain('동의하지 않은 글 0건');
  });

  it('동의 글이 없으면 전체 복사와 빈 목록을 만들지 않는다', () => {
    const html = renderToStaticMarkup(<RecommendationList items={[]} unconsentedCount={1} />);
    expect(html).not.toContain('<button');
    expect(html).not.toContain('<ol');
    expect(html).not.toContain('모두 복사');
    expect(html).toContain('동의하지 않은 글 1건은 싣지 않았습니다.');
  });

  it('추천 원문은 HTML로 해석하지 않는다', () => {
    const html = renderToStaticMarkup(<RecommendationList items={[{ text: '<script>원문</script>', attribution: '여·40대' }]} unconsentedCount={0} />);
    expect(html).toContain('&lt;script&gt;원문&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });
});
