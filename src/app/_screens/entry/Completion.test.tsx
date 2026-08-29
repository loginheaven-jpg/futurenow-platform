import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Completion } from './Completion';

describe('Completion (§7.5 — 의미색·측정 0건, 우아한 저하)', () => {
  it('mirror 있으면 ②③⑤ 렌더, 의미색·돌봄·버킷 라벨 0건', () => {
    const html = renderToStaticMarkup(
      <Completion
        mirror={{
          direction: '나침반 응답은 가능성을 향한 마음에 가깝습니다.',
          longing: '응답에서는 지금보다 더 살아있는 감각을 찾는 방향이 두드러집니다.',
          faith: '적어 주신 믿음의 자리도 앞으로 선택을 세울 때 함께 봅니다.',
        }}
      />,
    );
    expect(html).toContain('가능성을 향한 마음'); // ②
    expect(html).toContain('두드러집니다'); // ③
    expect(html).toContain('선택을 세울 때 함께 봅니다'); // ⑤ 믿음 한 줄(D-09)
    // 하드룰: danger/warning/care 의미색·severity·red flag·돌봄 배너·버킷 라벨 0
    expect(html).not.toMatch(/--care|--danger|--warning|severity|red.?flag|돌봄|시들음|번성|위기/i);
  });

  it('mirror 없으면(저하) ①+④만, ②③ 생략', () => {
    const html = renderToStaticMarkup(<Completion mirror={null} />);
    expect(html).toContain('여기까지의 기록을 마쳤습니다'); // ① 마무리 헤더(J-05)
    expect(html).toContain('인도자가 확인합니다'); // ④ 핸드오프(J-06)
    expect(html).not.toContain('두드러집니다'); // ③ 갈망 문장 없음
    expect(html).toContain('마치기'); // ⑥ 닫기 항상
  });
});
