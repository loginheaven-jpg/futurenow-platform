import { safeReturnTo } from '@/app/_lib/safeReturn';
import { describe, expect, it } from 'vitest';
import { config as proxyConfig } from './proxy';
import { isProtectedPath, PROXY_MATCHER, proxyMatcherCovers , loginRedirectSearch } from './proxy.guard';

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

  // ADR-93. 개발용 미리보기가 인증 없이 열려 사전진단 문항 원문 전량·리포트 구조가 공개돼 있었다.
  // 네 라우트를 개별로 못 박는다 — 누가 하나를 빠뜨리고 되돌리면 여기서 깨진다.
  it('보호: /preview 및 하위(개발용 미리보기 — 문항 원문·리포트 구조 노출 경로)', () => {
    for (const p of ['/preview', '/preview/console', '/preview/entry', '/preview/report', '/preview/뭐가-늘어도']) {
      expect(isProtectedPath(p)).toBe(true);
    }
  });

  it('공개(통과): /·/login·/signup·/join·/reset', () => {
    for (const p of ['/', '/login', '/signup', '/join', '/reset', '/reset/confirm']) {
      expect(isProtectedPath(p)).toBe(false);
    }
  });

  it('접두 오매칭 방지(/homex·/coaching·/joinx·/previewer 비보호)', () => {
    expect(isProtectedPath('/homex')).toBe(false);
    expect(isProtectedPath('/coaching')).toBe(false);
    expect(isProtectedPath('/joinx')).toBe(false);
    expect(isProtectedPath('/previewer')).toBe(false);
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

describe('loginRedirectSearch — 민감 쿼리는 버리고 경로만 살린다', () => {
  it('경로를 returnTo 로 싣는다', () => {
    expect(loginRedirectSearch('/my/values')).toBe('?returnTo=%2Fmy%2Fvalues');
    expect(loginRedirectSearch('/home/assessments')).toBe('?returnTo=%2Fhome%2Fassessments');
  });

  it('**원 요청의 쿼리는 인자로 받지도 않는다** — 전파될 경로가 구조적으로 없다', () => {
    // af6576d 가 세운 근거(토큰·민감 쿼리 미전파)를 지킨다. 함수가 pathname 만 받으므로
    // 호출부가 실수로 search 를 섞을 방법이 없다.
    expect(loginRedirectSearch.length).toBe(1);
    expect(loginRedirectSearch('/my/values')).not.toMatch(/access_token|token|code=/);
  });

  it('/feed 는 보호 라우트다 — 미인증이 미들웨어에서 걸린다(발주 §8)', () => {
    expect(isProtectedPath('/feed')).toBe(true);
    // 접두 오매칭은 막는다 — '/feeds' 같은 공개 경로가 생겨도 휩쓸리지 않는다.
    expect(isProtectedPath('/feeds')).toBe(false);
    expect(isProtectedPath('/feedback')).toBe(false);
    // **matcher 는 그대로다**(불변식 17) — 접두사를 더하는 것은 넓히는 방향이다.
    expect(proxyMatcherCovers('/feed')).toBe(true);
  });

  it('경로가 아니면 빈 쿼리 — 붙이지 않는다', () => {
    for (const bad of ['', 'my/values', 'https://evil.test/x', '//evil.test/x']) {
      expect(loginRedirectSearch(bad), bad).toBe('');
    }
  });

  it('실은 값이 화이트리스트를 그대로 통과한다 — 두 끝을 묶는다', () => {
    // 여기서 화이트리스트를 다시 구현하지 않는다(사본이 둘). 대신 왕복이 성립함을 단언한다.
    for (const p of ['/my/values', '/home/assessments', '/feed', '/my/cohorts/11111111-1111-1111-1111-111111111111/values']) {
      const q = loginRedirectSearch(p);
      const got = decodeURIComponent(new URLSearchParams(q).get('returnTo') ?? '');
      expect(safeReturnTo(got), p).toBe(p);
    }
  });
});
