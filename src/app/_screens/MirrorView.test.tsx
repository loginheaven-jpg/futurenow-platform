import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MirrorView } from './MirrorView';

describe('MirrorView (갈망 거울 — 측정 비노출 하드룰)', () => {
  const html = renderToStaticMarkup(
    <MirrorView
      mirror={{
        direction: '지금 당신의 마음은 가능성을 향한 마음 쪽으로 향하고 있어요.',
        longing: '지금 당신은 더 깊이 살아있기를 갈망하고 있어요.',
      }}
    />,
  );

  it('방향·갈망 문장을 렌더', () => {
    expect(html).toContain('가능성을 향한 마음');
    expect(html).toContain('갈망하고 있어요');
  });

  it('하드룰(ADR-27): severity·버킷 라벨·돌봄 신호·의미색 0건', () => {
    expect(html).not.toMatch(/시들음|중간|번성|위기|red.?flag|severity|돌봄/i);
    expect(html).not.toMatch(/--care|--danger|--warning/);
  });
});
