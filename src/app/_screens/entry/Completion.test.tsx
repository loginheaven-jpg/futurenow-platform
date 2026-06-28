import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Completion } from './Completion';

describe('Completion (§7.5 — 의미색·측정 0건, 우아한 저하)', () => {
  it('mirror 있으면 ②③⑤ 렌더, 의미색·돌봄·버킷 라벨 0건', () => {
    const html = renderToStaticMarkup(
      <Completion
        mirror={{
          direction: '지금 당신의 마음은 가능성을 향한 마음 쪽으로 향하고 있어요.',
          longing: '지금 당신은 더 깊이 살아있기를 갈망하고 있어요.',
          faith: '당신이 붙잡고 있는 그 믿음이, 앞으로의 길에 빛이 되기를 바라요.',
        }}
      />,
    );
    expect(html).toContain('가능성을 향한 마음'); // ②
    expect(html).toContain('갈망하고 있어요'); // ③
    expect(html).toContain('빛이 되기를'); // ⑤
    // 하드룰: danger/warning/care 의미색·severity·red flag·돌봄 배너·버킷 라벨 0
    expect(html).not.toMatch(/--care|--danger|--warning|severity|red.?flag|돌봄|시들음|번성|위기/i);
  });

  it('mirror 없으면(저하) ①+④만, ②③ 생략', () => {
    const html = renderToStaticMarkup(<Completion mirror={null} />);
    expect(html).toContain('수고하셨어요'); // ① 마무리 헤더
    expect(html).toContain('인도자가 함께 살펴볼'); // ④ 핸드오프
    expect(html).not.toContain('갈망하고'); // ③ 갈망 문장 없음
    expect(html).toContain('마치기'); // ⑥ 닫기 항상
  });
});
