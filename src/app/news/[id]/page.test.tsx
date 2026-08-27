// `/news/[id]` 회귀 — **글이 바뀌면 댓글도 바뀐다**.
//
// 피드에서 실기기로 잡힌 결함(2026-08-27)과 **같은 부류**다. `/news/1` → `/news/2` 는
//   같은 자리에 같은 컴포넌트를 다시 그리므로 재마운트되지 않고, `useState(initial)` 이
//   첫 값만 쓰므로 댓글이 옛 글 것을 붙든다. 그런데 postId prop 은 갱신되므로
//   **보는 글과 쓰는 글이 어긋난다** — 피드에서 실제로 그렇게 났다.
//
// 피드만 고치고 여기를 두면 같은 결함을 두 번 만나게 된다. 부류를 함께 막는다.
import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

const POST_1 = 'cccccccc-0000-0000-0000-000000000001';
const POST_2 = 'cccccccc-0000-0000-0000-000000000002';

vi.mock('@/core/supabase/server', () => ({
  createServerContext: async () => ({
    getNews: async (id: string) => ({
      id, title: `소식 ${id}`, body: '본문', publishedAt: '2026-08-27T00:00:00Z',
      createdAt: '2026-08-27T00:00:00Z', authorId: 'admin',
    }),
    currentUser: async () => ({ id: 'me', email: 'me@t.test', name: '나', nickname: null, role: 'user' }),
    listNewsComments: async (id: string) => [
      { id: `comment-of-${id}`, authorId: 'u', authorName: '누구', body: '한마디', createdAt: '2026-08-27T00:00:00Z' },
    ],
  }),
}));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));

import NewsDetailPage from './page';
import { NewsComments } from './NewsComments';

function find(node: unknown): ReactElement | null {
  if (Array.isArray(node)) {
    for (const n of node) { const hit = find(n); if (hit) return hit; }
    return null;
  }
  if (!node || typeof node !== 'object') return null;
  const el = node as ReactElement & { props?: { children?: unknown } };
  if (el.type === NewsComments) return el;
  return find(el.props?.children);
}

const render = (id: string) => NewsDetailPage({ params: Promise.resolve({ id }) }) as Promise<ReactElement>;

describe('/news/[id] — 글이 바뀌면 댓글도 바뀐다', () => {
  it('**NewsComments 가 글 id 로 keyed 돼 있다**', async () => {
    const el = find(await render(POST_1));
    expect(el, 'NewsComments 가 트리에 있다').not.toBeNull();
    expect(el?.key, 'key 가 없으면 옛 글의 댓글이 남는다').toBe(POST_1);
  });

  it('**다른 글이면 key 도 다르다** — 같으면 React 가 상태를 재사용한다', async () => {
    const a = find(await render(POST_1));
    const b = find(await render(POST_2));
    expect(a?.key).not.toBe(b?.key);
    expect(b?.key).toBe(POST_2);
  });

  it('key·postId·댓글이 같은 글을 가리킨다 — 보는 글과 쓰는 글이 갈리지 않는다', async () => {
    const el = find(await render(POST_2));
    const props = el?.props as { postId: string; initial: { id: string }[] };
    expect(props.postId).toBe(POST_2);
    expect(props.initial[0].id).toBe(`comment-of-${POST_2}`);
    expect(el?.key).toBe(props.postId);
  });
});
