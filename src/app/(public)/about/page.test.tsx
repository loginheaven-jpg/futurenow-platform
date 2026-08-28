// 소개 상세(/about) 잠금 (4차 F-2).
//
// **현관에서 옮겨 온 것을 여기서 잠근다.** 시안 P1 의 현관에는 소개 3단락이 없어
//   `/` 에서 뺐다 — 그러면 `page.test.tsx` 가 지키던 `어떤 시간인가요…` 세 소제목이
//   **아무 데서도 지켜지지 않는다.** 옮긴 곳에 같은 잠금을 다시 건다.
//   (규율을 옮기지 않고 화면만 옮기면, 다음 사람이 지워도 아무도 모른다.)
import { describe, expect, it, beforeAll } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import About from './page';

describe('/about — 소개 상세', () => {
  let html = '';
  beforeAll(() => {
    html = renderToStaticMarkup(<About />);
  });

  it('**소개 세 단락(의문형 소제목)** — `/` 에서 옮겨 온 잠금', () => {
    expect(html).toContain('어떤 시간인가요');
    expect(html).toContain('무엇이 달라지나요');
    expect(html).toContain('어떻게 진행되나요');
    expect(html).toContain('사전 체크'); // 진행 본문
  });

  it('참여 경로 셋이 다 있다 — 신청·로그인·단체 구매 문의', () => {
    // F-2b 에서 `/about` 구성이 발주 §4 순서로 바뀌었다. `/recruit` 대신 **신청 CTA 가 `/join`** 이다
    //   (원고 §7 — 신청 도착점은 `/join`). 로그인은 GNB, 문의는 도서 단체 구매 줄이 든다.
    // **`/login` 은 껍데기(GNB)로 옮겼다**(U-1) — `PublicShell.test.tsx` 가 잰다.
    //   본문이 스스로 거는 둘은 여기가 계속 잰다.
    for (const href of ['/join', '/contact']) {
      expect(html, href).toContain(`href="${href}"`);
    }
  });

  it('**골드 primary 는 세미나 신청 전용이다**(원고 §3.4 위계) — 구매 버튼은 ghost', () => {
    expect(html).toContain('--color-text-on-gold'); // 신청 CTA 만 골드 면
    const buy = html.slice(html.indexOf('kyobobook') - 200, html.indexOf('kyobobook') + 200);
    expect(buy, '구매 버튼이 골드면 위계가 무너진다').toContain('ui-btn--ghost');
    expect(buy).toContain('rel="noopener noreferrer"');
    expect(buy).toContain('target="_blank"');
  });

  it('공개 화면 규율 — 의미색 토큰 0', () => {
    for (const token of ['--care-', '--color-danger', '--color-warning']) {
      expect(html, token).not.toContain(token);
    }
  });

  it('**새 형태를 만들지 않았다** — 시안 없는 화면이라 승인 부품만 쓴다(불변식 20)', () => {
    // 부품이 남기는 클래스만으로 화면이 선다. `site-` 접두 밖의 새 조어가 없다는 뜻은 아니고,
    //   **§9.7 부품과 기존 `ui-` 공용 부품 밖의 형태를 새로 짓지 않았다**는 뜻이다.
    // `site-gnb`·`site-foot` 은 **껍데기가 그린다**(U-1) — 그 둘은 `PublicShell.test.tsx` 가 잰다.
    for (const cls of ['site-hero', 'site-grow', 'site-sect', 'site-leader', 'site-book']) {
      expect(html, cls).toContain(cls);
    }
    // 규칙 1 회귀 잠금 — 화면이 다시 그리기 시작하면 여기서 레드가 난다.
    for (const cls of ['site-gnb', 'site-foot']) expect(html, cls).not.toContain(cls);
  });
});
