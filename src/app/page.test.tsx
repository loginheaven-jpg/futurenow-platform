import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Home from './page';

describe('루트 현관 (/) — 공개 소개 현관(진입-1)', () => {
  const html = renderToStaticMarkup(<Home />);

  it('권유부 + 골드 CTA(함께 시작해 볼까요?) → /join, 네이비 글자', () => {
    expect(html).toContain('어떤 사람일까요'); // 권유 문구(hero)
    expect(html).toContain('함께 시작해 볼까요?');
    expect(html).toContain('href="/join"');
    expect(html).toContain('--color-text-on-gold'); // 골드 면 + 네이비 글자 유지
  });

  it('코드 보조 링크(코드로 입장) → /join', () => {
    expect(html).toContain('코드로 입장');
  });

  it('소개 세 단락(개요·효과·진행방식)', () => {
    expect(html).toContain('개요');
    expect(html).toContain('효과');
    expect(html).toContain('진행방식');
    expect(html).toContain('사전 진단'); // 진행방식 본문
  });

  it('인도자 진입(보조) → /login·/signup', () => {
    expect(html).toContain('href="/login"');
    expect(html).toContain('인도자 로그인');
    expect(html).toContain('href="/signup"');
    expect(html).toContain('회원가입');
  });

  it('옛 결정화면 CTA·플레이스홀더 제거', () => {
    expect(html).not.toContain('참여하기'); // 옛 CTA 문구
    expect(html).not.toMatch(/토대 구축 단계|디자인 시스템 확정 후/);
  });

  it('참여자 화면 — 의미색 토큰 0', () => {
    expect(html).not.toMatch(/--care|--danger|--warning/);
  });
});
