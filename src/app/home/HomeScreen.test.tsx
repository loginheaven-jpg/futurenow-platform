// 통합 홈 표시 층 단언 (4차 F-3 · 시안 B·E).
//
// **세션 없이 화면을 잡는다.** `/home` 은 인증 뒤라 QA 계정 없이 열 수 없는데,
//   표시 층을 순수 컴포넌트로 뗀 덕에 여기서 전수할 수 있다(F-1 `sheetKeys` 와 같은 방식).
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HomeScreen, type HomeScreenProps } from './HomeScreen';

const base: HomeScreenProps = {
  who: { name: '김서온', role: '참여자', cohort: '예봄 2기' },
  role: { badge: '예봄 2기', who: '참여자', title: '내 기수로 가기', sub: '2회차 갈무리가 열려 있습니다', href: '/my/cohorts/c1', ctaLabel: '기수 홈' },
  tiles: [{ icon: 'checkin', title: '오늘의 갈무리', hint: '2회차', href: '/my/cohorts/c1/checkin/2' }],
  news: [{ id: 'n1', title: '2회차 준비물 안내', date: '8.20', href: '/news/n1' }],
  groups: [{ title: '여정', items: [{ href: '/my/cohorts/c1', label: '내 기수' }] }],
  chips: [{ no: 1, state: 'done', href: '/x' }, { no: 2, state: 'current', href: '/y' }, { no: 3, state: 'locked' }],
};

describe('HomeScreen — 시안 B', () => {
  it('**로그인 홈 GNB 는 로고 + 햄버거뿐이다** — 메뉴 줄도 로그인 버튼도 없다', () => {
    const html = renderToStaticMarkup(<HomeScreen {...base} />);
    expect(html).toContain('site-gnb__burger');
    expect(html, '로그인한 사람에게 로그인 버튼을 다시 보이지 않는다').not.toContain('site-gnb__login');
    expect(html, '메뉴 줄은 시트가 든다').not.toContain('site-gnb__nav');
  });

  it('역할 카드가 목적지 하나를 가리킨다 — 판정은 페이지가 한다', () => {
    const html = renderToStaticMarkup(<HomeScreen {...base} />);
    expect(html).toContain('href="/my/cohorts/c1"');
    expect(html).toContain('내 기수로 가기');
    expect(html).toContain('예봄 2기'); // 배지
  });

  it('**갈 곳이 없으면 구획째 그리지 않는다** — 빈 상자를 남기지 않는다', () => {
    const html = renderToStaticMarkup(<HomeScreen {...base} tiles={[]} news={[]} />);
    expect(html).not.toContain('바로가기');
    expect(html).not.toContain('site-news');
    expect(html).not.toContain('더 보기');
  });

  it('**탭바를 그리지 않는다** — 시안 A·B 의 `.tabbar` 는 불채택이다(§9.6)', () => {
    const html = renderToStaticMarkup(<HomeScreen {...base} />);
    expect(html).not.toContain('tabbar');
  });

  it('복귀 안내와 본문은 슬롯이다 — 이번 회차 무접촉 대상', () => {
    const html = renderToStaticMarkup(
      <HomeScreen {...base} prompt={<div id="p">복귀</div>}><div id="m">본문</div></HomeScreen>,
    );
    expect(html).toContain('id="p"');
    expect(html).toContain('id="m"');
  });

  it('참여자 화면 규율 — 의미색 토큰 0(불변식 9)', () => {
    const html = renderToStaticMarkup(<HomeScreen {...base} />);
    for (const t of ['--care-', '--color-danger', '--color-warning']) expect(html, t).not.toContain(t);
  });
});
