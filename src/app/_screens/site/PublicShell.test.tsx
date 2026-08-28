import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PublicShell } from './PublicShell';

// 공개 껍데기 — **화면에서 옮겨온 단언이 사는 자리** (U-1).
//
// `/` 와 `/about` 의 테스트가 헤더·푸터 링크를 재고 있었다. 그 층이 껍데기로 올라갔으므로
//   단언도 함께 올라온다 — **지우지 않고 옮겼다.** 지우면 *로그인 문이 있는가* 를
//   아무도 재지 않게 되고, 그것이 이 이관에서 잃기 가장 쉬운 것이다.
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

const html = renderToStaticMarkup(<PublicShell><div id="본문" /></PublicShell>);

describe('공개 껍데기 — 상단바와 푸터가 한 곳에 선다', () => {
  it('상단바와 푸터를 그린다', () => {
    expect(html).toContain('site-gnb');
    expect(html).toContain('site-foot');
  });

  it('**본문을 그대로 통과시킨다** — 껍데기가 화면을 고쳐 쓰지 않는다', () => {
    expect(html).toContain('id="본문"');
  });

  it('로그인·인도자 진입 → `/login`·`/signup` (화면에서 옮겨온 단언)', () => {
    expect(html).toContain('href="/login"');
    expect(html).toContain('로그인');
    expect(html).toContain('href="/signup"');
    expect(html).toContain('인도자 회원가입');
  });

  it('공개 영역으로 가는 길이 있다 (화면에서 옮겨온 단언)', () => {
    for (const href of ['/about', '/library', '/contact', '/news']) {
      expect(html, href).toContain(`href="${href}"`);
    }
  });

  it('**서버 스냅샷은 비로그인이다** — 정적 HTML 이 그렇게 캐시되므로 같아야 한다', () => {
    // ADR-138 그대로다. 다르면 하이드레이션이 어긋나고 ISR 캐시가 거짓말을 한다.
    expect(html).toContain('href="/login"');
    expect(html).not.toContain('href="/home"');
  });

  it('로고는 처음 화면으로 이동만 한다 — 로그아웃이 아니다(§12.3 규칙 3)', () => {
    expect(html).toContain('href="/"');
    expect(html).not.toContain('로그아웃');
  });
});
