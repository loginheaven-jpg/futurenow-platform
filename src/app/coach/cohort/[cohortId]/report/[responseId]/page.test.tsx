// 리포트 패널 재마운트 회귀 (3차 T-2 · 발현 확인 2026-08-27).
//
// **표시 결함이 아니라 데이터 오염이었다.** 리포트→리포트 이동(`MemberJourney` 형제 링크)은
//   같은 자리에 같은 컴포넌트를 다시 그리므로 재마운트가 없다. 그때 남는 것이 셋이다.
//     · `vm` 이 **이전 참여자의 해석**을 붙든다 — 인도자가 A 화면에서 B 해석을 읽는다
//     · `triggered` ref 가 살아남아 다음 리포트를 **영영 다시 부르지 않는다**
//     · `editing`·`draft` 가 살아, 편집 중 이동해 저장하면
//       `saveCoachInterpretationAction(responseId=B, content=A의 초안)` 이 되어
//       **A의 해석이 B의 기록에 써진다**
//
// **테스트는 "무엇이 깨졌는지"에 맞춘다**(2차 §11.4 규율). 깨진 것은 패널의 존재가 아니라
//   **key·responseId·initial 이 같은 리포트를 가리키는가** 하는 신원 결속이다.
//   그래서 렌더하지 않고 엘리먼트의 key 와 props 를 직접 읽는다.
import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

const R1 = '11111111-1111-1111-1111-111111111111';
const R2 = '22222222-2222-2222-2222-222222222222';
const COHORT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

vi.mock('@/core/supabase/server', () => ({
  createServerContext: async () => ({
    currentUser: async () => ({ id: 'coach', email: 'c@t.test', name: '코치', nickname: null, role: 'coach' }),
    getResponse: async (id: string) => ({
      id, instrumentId: 'futurenow', cohortId: COHORT, userId: `user-of-${id}`,
      wave: 'pre', answers: {}, subjectProfile: {}, createdAt: '2026-08-27T00:00:00Z',
    }),
    getCohort: async () => ({ id: COHORT, name: '기수', code: 'ABCDE' }),
    listCohortMembers: async () => [],
    // 페이지는 effective 와 aiContent 가 **둘 다** 있을 때만 initialVm 을 만든다(page.tsx:57).
    getInterpretation: async (id: string) => ({
      effective: { headline: `해석-${id}`, axes: [], growth: 'g' },
      aiContent: { headline: `해석-${id}`, axes: [], growth: 'g' },
      coachContent: null, aiModel: null, editedBy: null, editedAt: null,
    }),
    getCohortMemberDetail: async () => null,
  }),
}));
vi.mock('@/instruments/futurenow/scoring', () => ({
  futurenowScoring: { score: () => ({ trap: { primary: 'x' } }) },
}));
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NOT_FOUND'); },
  redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); },
}));

import CoachReportPage from './page';
import { InterpretationPanel } from './InterpretationPanel';

function find(node: unknown): ReactElement | null {
  if (Array.isArray(node)) {
    for (const n of node) { const hit = find(n); if (hit) return hit; }
    return null;
  }
  if (!node || typeof node !== 'object') return null;
  const el = node as ReactElement & { props?: { children?: unknown } };
  if (el.type === InterpretationPanel) return el;
  return find(el.props?.children);
}

const render = (responseId: string) =>
  CoachReportPage({ params: Promise.resolve({ cohortId: COHORT, responseId }) }) as Promise<ReactElement>;

describe('리포트 패널 — 리포트가 바뀌면 패널도 새로 선다', () => {
  it('**InterpretationPanel 이 responseId 로 keyed 돼 있다**', async () => {
    const el = find(await render(R1));
    expect(el, '패널이 트리에 있다').not.toBeNull();
    expect(el?.key, 'key 가 없으면 이전 참여자의 해석이 남는다').toBe(R1);
  });

  it('**다른 리포트면 key 도 다르다** — 같으면 React 가 상태를 재사용한다', async () => {
    const a = find(await render(R1));
    const b = find(await render(R2));
    expect(a?.key).toBe(R1);
    expect(b?.key).toBe(R2);
    expect(a?.key).not.toBe(b?.key);
  });

  it('key·responseId·initial 이 **같은 리포트**를 가리킨다', async () => {
    // 셋이 어긋나면 A 화면에 B 해석이 뜨고, 편집 중 이동하면 A 초안이 B 기록에 써진다.
    const el = find(await render(R2));
    const props = el?.props as { responseId: string; initial: { effective?: { headline?: string } } | null };
    expect(props.responseId, 'prop 도 전환된 리포트다').toBe(R2);
    expect(el?.key, 'key 가 prop 과 같은 리포트를 가리킨다').toBe(props.responseId);
    expect(props.initial?.effective?.headline, '해석도 그 리포트 것이다').toBe(`해석-${R2}`);
  });
});
