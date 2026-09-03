// 회기 선택 줄 — **그려서 잰다** (ADR-182).
//
// ★ 구조 잠금만으로는 부족하다. 같은 회차에 `.is-open` 을 **CSS 에만** 쓰고 부품이 안 내보내는 것을
//   구조 잠금이 놓쳤고 **배포해서 값으로** 잡았다(계열 ⑦). 그래서 여기서는 **산출물**을 본다.
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CoreContext, CoreUser, MyCohortSummary } from '@/contracts';
import { renderCohortDashboard } from './dashboard';

const cohort = (over: Partial<MyCohortSummary> = {}): MyCohortSummary => ({
  cohortId: 'c1', name: '예봄 2기', coachName: null, status: 'active',
  preDone: true, postDone: false, postOpened: false,
  openSessionNo: null, openSessionSubmitted: false, openSessionHasContent: false,
  joinedAt: '2026-06-01', ...over,
});

const me = { id: 'u1', email: 'u1@t.test', name: '나', nickname: null, role: 'user' } as CoreUser;

/** 대시보드가 부르는 것만 흉내 낸다. 판정은 이 잠금의 대상이 아니다. */
const ctx = (lastPost: string | null = null) => ({
  listCohortSessions: vi.fn(async () => []),
  getMyCheckin: vi.fn(async () => null),
  getMyValueAssessment: vi.fn(async () => null),
  feedMyLastPostAt: vi.fn(async () => lastPost),
}) as unknown as CoreContext;

describe('★★ 회기 선택 줄 — 그려서 잰다', () => {
  it('★ 활성이 둘이면 **둘 다 그려지고 지금 것이 표시된다**', async () => {
    const a = cohort({ cohortId: 'a', name: '예봄 1기' });
    const b = cohort({ cohortId: 'b', name: '예봄 2기' });
    const html = renderToStaticMarkup(await renderCohortDashboard(ctx(), me, b, [a, b]) as React.ReactElement);
    expect(html, '선택 줄이 없다').toContain('회기 선택');
    expect(html, '다른 회기로 갈 문이 없다').toContain('/my/cohorts/a');
    expect(html, '이름이 안 보인다').toContain('예봄 1기');
    // 지금 보는 것은 면(primary), 나머지는 테두리(ghost) — 색만으로 말하지 않는다.
    expect(html).toContain('ui-btn ui-btn--primary');
    expect(html).toContain('ui-btn ui-btn--ghost');
    expect(html, '지금 것을 보조기술에 안 알린다').toContain('aria-current="page"');
  });

  it('★★ 하나뿐이면 **줄을 안 그린다** — 고를 것이 없는데 고르라 하지 않는다', async () => {
    const html = renderToStaticMarkup(await renderCohortDashboard(ctx(), me, cohort(), [cohort()]) as React.ReactElement);
    expect(html, '하나뿐인데 선택 줄을 그렸다').not.toContain('회기 선택');
  });

  it('★ 안 주면 안 그린다 — 기본값이 안전한 쪽이다', async () => {
    const html = renderToStaticMarkup(await renderCohortDashboard(ctx(), me, cohort()) as React.ReactElement);
    expect(html).not.toContain('회기 선택');
  });

  it('★★ 동행 피드에 **마지막 쓴 날이 실제로 찍힌다**(ADR-180)', async () => {
    // ★ **정오를 쓴다.** 처음엔 23:36Z 를 넣었는데 그것은 UTC 와 KST 에서 **날짜가 다르다** —
    //   잠금이 돌리는 기계의 시간대에 기대게 된다(⑵ 얼어야 하는 값에 환경 의존을 두지 않는다).
    const html = renderToStaticMarkup(await renderCohortDashboard(ctx('2026-08-27T12:00:00Z'), me, cohort()) as React.ReactElement);
    expect(html, '날짜가 안 보인다').toContain('8월 27일');
    // 쓴 적이 없으면 옛 곁말 그대로 — 없는 말을 짓지 않는다.
    const none = renderToStaticMarkup(await renderCohortDashboard(ctx(null), me, cohort()) as React.ReactElement);
    expect(none).toContain('오늘의 걸음');
    expect(none, '쓴 적이 없는데 날짜를 지어냈다').not.toContain('월 ');
  });
});
