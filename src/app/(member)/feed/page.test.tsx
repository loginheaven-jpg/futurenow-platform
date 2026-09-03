// `/feed` 서버 컴포넌트 회귀 — **회기 전환이 실제로 화면을 바꾸는가**.
//
// 이 파일은 실기기 검증(2026-08-27)에서 나온 FAIL 1건의 회귀 잠금이다.
//   증상: 회기 칩을 눌러도 목록이 바뀌지 않는다.
//   원인: 칩은 같은 라우트에서 **쿼리만** 바꾸므로 FeedClient 가 재마운트되지 않고,
//        `useState(initialPosts)` 가 첫 값만 쓰므로 posts 가 옛 회기 글을 붙든다.
//        그런데 selectedCohortId 는 prop 이라 갱신된다 — **보는 회기와 쓰는 회기가 어긋난다.**
//   수정: page.tsx 가 `key={selected.cohortId}` 를 준다.
//
// **왜 이 층에서 테스트하는가.** 단위·통합·DB 검증 어느 것도 이 결함을 잡지 못했다 —
//   전부 옳게 동작했기 때문이다(서버는 정확한 글을 내려보냈다). 깨진 것은 **화면의 상태 수명**이고,
//   그것을 결정하는 것은 페이지가 자식에게 key 를 주는가 하나다. 그래서 페이지가 만들어 낸
//   **엘리먼트 트리를 직접 본다** — 렌더 없이 key 를 읽는다(jsdom·testing-library 없이 가능).
import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

const COHORT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'; // 최신 활성 → 기본 선택
const COHORT_B = 'bbbbbbbb-0000-0000-0000-00000000000b';

const listFeed = vi.fn(async ({ cohortId }: { cohortId: string }) => [
  { id: `post-of-${cohortId}`, authorId: 'u', authorName: '누구', body: '글', photoPath: null,
    createdAt: '2026-08-27T00:00:00Z', deleted: false, commentCount: 0, reactions: {}, myReactions: [] },
]);

vi.mock('@/core/supabase/server', () => ({
  createServerContext: async () => ({
    currentUser: async () => ({ id: 'me', email: 'me@t.test', name: '나', nickname: null, role: 'user' }),
    listFeedCohorts: async () => [
      { cohortId: COHORT_A, name: '2기', status: 'active', isCoach: false, lastPostAt: null },
      { cohortId: COHORT_B, name: '1기', status: 'active', isCoach: true, lastPostAt: null },
    ],
    listFeed,
    signFeedPhotos: async () => ({}),
  }),
}));
vi.mock('next/navigation', () => ({ redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); } }));

import FeedPage from './page';
import { FeedClient } from './FeedClient';

/** 엘리먼트 트리에서 FeedClient 를 찾는다(렌더하지 않는다 — key 는 엘리먼트의 성질이다). */
function findFeedClient(node: unknown): ReactElement | null {
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = findFeedClient(n);
      if (hit) return hit;
    }
    return null;
  }
  if (!node || typeof node !== 'object') return null;
  const el = node as ReactElement & { props?: { children?: unknown } };
  if (el.type === FeedClient) return el;
  return findFeedClient(el.props?.children);
}

const render = (cohort?: string) =>
  FeedPage({ searchParams: Promise.resolve(cohort ? { cohort } : {}) }) as Promise<ReactElement>;

describe('/feed — 회기 전환이 화면을 바꾼다', () => {
  it('**FeedClient 가 회기로 keyed 돼 있다** — 이것이 없으면 칩을 눌러도 목록이 그대로다', async () => {
    const el = findFeedClient(await render());
    expect(el, 'FeedClient 가 트리에 있다').not.toBeNull();
    expect(el?.key, 'key 가 붙어 있어야 한다(없으면 null)').not.toBeNull();
    expect(el?.key).toBe(COHORT_A);
  });

  it('**회기가 다르면 key 도 다르다** — 같으면 React 가 상태를 재사용해 결함이 되살아난다', async () => {
    const a = findFeedClient(await render(COHORT_A));
    const b = findFeedClient(await render(COHORT_B));
    expect(a?.key).toBe(COHORT_A);
    expect(b?.key).toBe(COHORT_B);
    expect(a?.key, '두 회기의 key 가 갈린다').not.toBe(b?.key);
  });

  it('선택된 회기의 글을 서버가 내려보낸다 — prop 과 key 가 같은 회기를 가리킨다', async () => {
    const b = findFeedClient(await render(COHORT_B));
    const props = b?.props as { selectedCohortId: string; initialPosts: { id: string }[] };
    expect(props.selectedCohortId, 'prop 도 전환된 회기다').toBe(COHORT_B);
    expect(props.initialPosts[0].id, '글도 그 회기 것이다').toBe(`post-of-${COHORT_B}`);
    // 이 셋이 어긋나면 '보는 회기'와 '쓰는 회기'가 갈린다 — 실기기에서 나온 그 증상이다.
    expect(b?.key).toBe(props.selectedCohortId);
  });

  it('모르는 회기 쿼리는 조용히 기본 회기로 떨어진다 — 추측해서 열지 않는다', async () => {
    const el = findFeedClient(await render('cccccccc-0000-0000-0000-00000000000c'));
    expect(el?.key).toBe(COHORT_A);
    expect((el?.props as { selectedCohortId: string }).selectedCohortId).toBe(COHORT_A);
  });

  it('기본 선택은 목록 첫 행이다 — 정렬(활성 우선·최신순)은 feed_my_cohorts 가 정한다', async () => {
    const el = findFeedClient(await render());
    // 화면이 정렬을 다시 하지 않는다. 판정이 두 곳이 되면 갈린다.
    expect(el?.key).toBe(COHORT_A);
  });
});
