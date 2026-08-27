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

  // **4차 F-2 에서 현관이 시안 P1·A 로 전면 교체됐다.** 아래 단언은 문구가 아니라
  //   **그 문구가 지키던 것**을 따라 옮겨 적었다 — 참여로 가는 길·로그인·모집·소식 규율.
  //   문구를 그대로 두면 테스트가 옛 화면을 지키고, 지우면 지키던 것이 함께 사라진다.
  it('참여로 가는 길 둘 — 신청(/recruit)과 코드 지름길(/join). 골드 면 + 네이비 글자', () => {
    expect(html).toContain('참여 신청');
    expect(html).toContain('href="/recruit"');
    expect(html).toContain('href="/join"'); // 링크만 받은 참여자의 문 — 없어지면 못 들어온다
    expect(html).toContain('--color-text-on-gold'); // 골드 면 + 네이비 글자 유지
  });

  it('코드 보조 링크(코드로 입장) → /join', () => {
    expect(html).toContain('코드로 입장');
  });

  it('**소개로 가는 길**이 있다 — 세 단락 본문은 /about 으로 옮겼다', () => {
    // 시안 P1 의 현관에는 소개 3단락이 없다(그 자리를 `.three` 카드가 든다).
    //   본문은 `/about` 이 들고 `about/page.test.tsx` 가 거기서 잠근다 — **사라진 것이 아니라 옮겼다.**
    //   옮겼다는 사실 자체는 완주 보고에 적었다(조용히 바꾸지 않는다).
    expect(html).toContain('href="/about"');
    expect(html).toContain('프로그램 소개'); // 히어로 CTA
  });

  it('로그인·인도자 진입 → /login·/signup', () => {
    expect(html).toContain('href="/login"');
    expect(html).toContain('로그인'); // GNB 우측 버튼이 옛 `이미 참여하셨나요?` 자리를 대신한다
    expect(html).toContain('href="/signup"');
    expect(html).toContain('인도자 회원가입'); // 푸터 — 인도자가 들어올 문
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

  it('모집이 /recruit 로 간다 — 소식 첫 줄이 모집 공지다', () => {
    expect(html).toContain('href="/recruit"');
    expect(html).toContain('모집'); // 소식 첫 줄 배지
    expect(html).toContain('예봄 2기'); // intake.ts 단일 출처
  });

  it('공개 영역 세 곳으로 가는 길이 있다', () => {
    for (const href of ['/about', '/library', '/contact', '/news']) {
      expect(html, href).toContain(`href="${href}"`);
    }
  });

  it('소식이 없으면 `더 보기` 를 주지 않는다 — 눌러서 빈 목록을 보지 않게', () => {
    // 테스트 환경은 env 가 없어 recentNews() 가 빈 배열이다.
    //   **구획 자체는 남는다** — 모집 줄과 모집 카드가 채우므로 빈 제목만 남는 일이 없다.
    expect(html).not.toContain('더 보기');
    expect(html).toContain('site-news__row'); // 모집 줄이 그 자리를 채운다
  });

  it('참여자 현관 규율 — 의미색을 쓰지 않는다', () => {
    for (const token of ['--care-', '--color-danger', '--color-warning']) {
      expect(html, token).not.toContain(token);
    }
  });
});
