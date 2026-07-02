import { describe, expect, it } from 'vitest';
import { config as proxyConfig } from './proxy';
import { isProtectedPath, PROXY_MATCHER, proxyMatcherCovers } from './proxy.guard';

describe('isProtectedPath (middleware 보호 경로 판정)', () => {
  it('보호: /home·/my·/coach·/admin 및 하위', () => {
    for (const p of [
      '/home',
      '/home/x',
      '/my',
      '/my/cohorts',
      '/my/cohorts/abc/report',
      '/coach',
      '/coach/cohort/x',
      '/coach/new',
      '/admin',
      '/admin/x',
      '/account',
      '/account/x',
    ]) {
      expect(isProtectedPath(p)).toBe(true);
    }
  });

  it('공개(통과): /·/login·/signup·/join·/reset', () => {
    for (const p of ['/', '/login', '/signup', '/join', '/reset', '/reset/confirm']) {
      expect(isProtectedPath(p)).toBe(false);
    }
  });

  it('접두 오매칭 방지(/homex·/coaching·/joinx 비보호)', () => {
    expect(isProtectedPath('/homex')).toBe(false);
    expect(isProtectedPath('/coaching')).toBe(false);
    expect(isProtectedPath('/joinx')).toBe(false);
  });
});

// matcher 불변식(S-1 위조-strip 커버리지·ADR-66). matcher 를 좁히면(라우트 제외 추가·allowlist 전환) 이 테스트가 깨진다.
describe('proxyMatcherCovers (matcher 불변식 — 좁히지 말 것)', () => {
  it('대표 인증 경로 + 공개 경로 + 임의 신규 경로가 matcher 에 매칭(strip 실행)', () => {
    for (const p of [
      '/home',
      '/account',
      '/coach',
      '/coach/cohort/abc/report/xyz',
      '/admin',
      '/my/cohorts',
      '/', // 공개 루트도 세션 갱신·strip 대상
      '/login',
      '/join',
    ]) {
      expect(proxyMatcherCovers(p)).toBe(true);
    }
  });

  it('불변식: 신규 라우트는 opt-in 없이 기본 커버(제외 목록에 추가하면 위조-strip 구멍)', () => {
    expect(proxyMatcherCovers('/brand-new-2027-feature')).toBe(true);
    expect(proxyMatcherCovers('/some/deep/未来/route')).toBe(true);
  });

  it('드리프트 가드: proxy.ts config.matcher === PROXY_MATCHER (Next 정적 리터럴 ↔ 테스트 소스 동기)', () => {
    // Next 정적 분석이 리터럴만 허용 → proxy.ts 는 리터럴, proxy.guard 는 상수. 둘이 갈라지면(누가 리터럴을 좁히면) 여기서 깨진다.
    expect(proxyConfig.matcher).toEqual([PROXY_MATCHER]);
  });

  it('정적 자산만 제외: _next(js/css 번들)·favicon·이미지 확장자', () => {
    for (const p of [
      '/_next/static/chunk.js',
      '/_next/static/app.css',
      '/_next/image',
      '/favicon.ico',
      '/logo.svg',
      '/a.png',
      '/b.jpg',
      '/c.jpeg',
      '/d.gif',
      '/e.webp',
    ]) {
      expect(proxyMatcherCovers(p)).toBe(false);
    }
  });
});
