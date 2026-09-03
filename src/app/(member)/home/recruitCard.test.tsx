// 회기 없는 회원의 참여 신청 카드 — **그려서 잰다** (ADR-183).
//
// ★ 「배열에 들어 있는가」는 「화면에 보이는가」를 말하지 않는다(계열 ⑦).
//   같은 회차에 `.is-open` 을 CSS 에만 쓰고 부품이 안 내보내 헛돈 일이 있었다.
//   그래서 **역할 카드 부품에 실제로 먹여** 산출물을 본다.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SiteRoleCard } from '@/app/_screens/site/RoleCard';
import { roleTargets } from './roleTarget';

describe('★★ 회기 0 — 참여 신청 카드가 실제로 그려진다', () => {
  const card = roleTargets('user', []).find((t) => t.href === '/recruit')!;

  it('카드가 산출에 있다 — 물 것이 실재한다', () => {
    expect(card, '참여 신청 카드가 없다').toBeTruthy();
  });

  it('★ 배지가 없어도 그려진다 — 회기가 없으니 배지도 없다', () => {
    const html = renderToStaticMarkup(
      <SiteRoleCard badge={card.cohort} who={card.who} title={card.title} sub={card.sub}
                    cta={{ href: card.href, label: card.ctaLabel }} />,
    );
    expect(card.cohort, '회기가 없는데 배지를 만들었다').toBeUndefined();
    expect(html, '제목이 안 보인다').toContain('세미나에 참여하시려면');
    expect(html, '설명이 안 보인다').toContain('참여 신청을 하시면 회기가 열립니다.');
    expect(html, '버튼이 안 보인다').toContain('참여 신청');
    expect(html, '갈 곳이 없다').toContain('href="/recruit"');
  });

  it('★ 회기가 있으면 그 카드가 아예 없다 — 이미 하신 분께 권하지 않는다', () => {
    const withCohort = roleTargets('user', [{
      cohortId: 'c1', name: '예봄 2기', coachName: null, status: 'active',
      preDone: true, postDone: false, postOpened: false,
      openSessionNo: null, openSessionSubmitted: false, openSessionHasContent: false,
      joinedAt: '2026-06-01',
    }]);
    expect(withCohort.some((t) => t.href === '/recruit')).toBe(false);
  });
});
