import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SeminarIntro } from './SeminarIntro';

describe('SeminarIntro (공통 소개 단일 출처 — 랜딩·코드 미리보기 공유)', () => {
  const html = renderToStaticMarkup(<SeminarIntro />);

  it('세 단락 의문형 소제목 + 본문', () => {
    expect(html).toContain('어떤 시간인가요');
    expect(html).toContain('무엇이 달라지나요');
    expect(html).toContain('어떻게 진행되나요');
    expect(html).toContain('사전 진단'); // 진행 본문
  });

  it('참여자 화면 — 의미색 토큰 0', () => {
    expect(html).not.toMatch(/--care|--danger|--warning/);
  });
});
