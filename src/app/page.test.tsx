import { beforeAll, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Home from './page';

describe('루트 현관 (/) — 공개 소개 현관(진입-1)', () => {
  // S-4 에서 현관이 **서버 비동기 컴포넌트**가 됐다(소식 미리보기). `renderToStaticMarkup(<Home />)` 는
  //   비동기 컴포넌트를 동기로 그리지 못해 suspend 로 터진다 — 그래서 **먼저 await 해서 엘리먼트를 얻는다.**
  //   단언은 한 줄도 바꾸지 않았다. 깨진 것은 렌더 방식이지 지키려던 내용이 아니다(ADR-111 처리와 같다).
  //   env 가 없는 테스트 환경에서 `recentNews()` 는 네트워크를 타지 않고 빈 배열을 돌려준다.
  let html = '';
  beforeAll(async () => {
    html = renderToStaticMarkup(await Home());
  });

  it('권유부 + 골드 CTA(함께 시작해 볼까요?) → /join, 네이비 글자', () => {
    expect(html).toContain('어떤 사람일까요'); // 권유 문구(hero)
    expect(html).toContain('함께 시작해 볼까요?');
    expect(html).toContain('href="/join"');
    expect(html).toContain('--color-text-on-gold'); // 골드 면 + 네이비 글자 유지
  });

  it('코드 보조 링크(코드로 입장) → /join', () => {
    expect(html).toContain('코드로 입장');
  });

  it('소개 세 단락(의문형 소제목)', () => {
    expect(html).toContain('어떤 시간인가요');
    expect(html).toContain('무엇이 달라지나요');
    expect(html).toContain('어떻게 진행되나요');
    expect(html).toContain('사전 체크'); // 진행 본문
  });

  it('로그인·인도자 진입(보조) → /login·/signup + 재방문 로그인', () => {
    expect(html).toContain('href="/login"');
    expect(html).toContain('로그인'); // 일반 로그인(전 역할 공용)
    expect(html).toContain('이미 참여하셨나요?'); // 상단 재방문 참여자 로그인 진입
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

describe('현관 공개 영역 배선 (S-4)', () => {
  let html = '';
  beforeAll(async () => {
    html = renderToStaticMarkup(await Home());
  });

  it('모집 배너가 /recruit 로 간다', () => {
    expect(html).toContain('href="/recruit"');
    expect(html).toContain('이번 기수 모집');
  });

  it('공개 영역 세 곳으로 가는 길이 있다', () => {
    for (const href of ['/about', '/library', '/contact', '/news']) {
      expect(html, href).toContain(`href="${href}"`);
    }
  });

  it('소식이 없으면 구획째 그리지 않는다 — 빈 제목만 남기지 않는다', () => {
    // 테스트 환경은 env 가 없어 recentNews()가 빈 배열이다. 그때 '더 보기'가 뜨면 안 된다.
    expect(html).not.toContain('더 보기');
  });

  it('참여자 현관 규율 — 의미색을 쓰지 않는다', () => {
    for (const token of ['--care-', '--color-danger', '--color-warning']) {
      expect(html, token).not.toContain(token);
    }
  });
});
