// 갈무리 카드 — **`?edit=1` 이 실제로 편집을 여는가** (3차 T-2 · 발현 증명).
//
// **이 파일은 갈무리를 한 줄도 바꾸지 않는다.** 발주 §8-5 가 금한 것은 갈무리 로직·문안 수정이지
//   검증이 아니다. 여기서 하는 일은 페이지가 만든 **엘리먼트 트리를 읽는 것**뿐이다
//   (2차 §9.3 이 만든 방법 — 렌더 없이 key 를 읽으므로 세션도 실기기도 필요 없다).
//
// **왜 이것이 급한가.** `mode.ts` 는 제출·마감과 무관하게 `?edit=1` 이면 무조건 `'edit'` 이다.
//   즉 그 링크는 **제출을 마친 사람이 자기 갈무리를 고치는 유일한 통로**다.
//   그런데 `CheckinCardClient` 는 `useState(initialMode)` 로 모드를 잡고,
//   `setMode` 호출부 둘은 **둘 다 `'read'` 로만** 간다 — `'edit'` 로 가는 클릭 경로가 없다.
//   그러면 `?edit=1` 은 **prop 을 바꿀 뿐 상태를 갈아끼우지 못한다.** 재마운트가 없으면 그렇다.
//
// 그래서 단언하는 것은 "링크가 있는가"가 아니라
//   **읽기로 연 카드와 `?edit=1` 로 연 카드가 서로 다른 인스턴스인가** 하나다.
import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

const COHORT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

// 1기의 실제 상태를 본뜬다 — **제출을 마친** 갈무리(45건이 이 상태다).
//   제출분은 `resolveCheckinMode` 가 'read' 로 열고, `?edit=1` 일 때만 'edit' 가 된다.
const SUBMITTED = { submittedAt: '2026-08-01T00:00:00Z', hasContent: true, answers: {} };

vi.mock('@/core/supabase/server', () => ({
  createServerContext: async () => ({
    currentUser: async () => ({ id: 'me', email: 'm@t.test', name: '나', nickname: null, role: 'user' }),
    listMyCohorts: async () => [{ cohortId: COHORT, name: '1기', status: 'active' }],
    listCohortSessions: async () => [{
      cohortId: COHORT, sessionNo: 1,
      opensAt: '2026-01-01T00:00:00Z', closesAt: '2099-01-01T00:00:00Z', heldAt: '2026-01-01T00:00:00Z',
    }],
    getMyCheckin: async () => SUBMITTED,
    listCheckinPhotos: async () => [],
  }),
}));
vi.mock('next/navigation', () => ({ redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); } }));

import CheckinCardPage from './page';
import { CheckinCardClient } from './CheckinCardClient';
import { resolveCheckinMode } from './mode';

function find(node: unknown): ReactElement | null {
  if (Array.isArray(node)) {
    for (const n of node) { const hit = find(n); if (hit) return hit; }
    return null;
  }
  if (!node || typeof node !== 'object') return null;
  const el = node as ReactElement & { props?: { children?: unknown } };
  if (el.type === CheckinCardClient) return el;
  return find(el.props?.children);
}

const render = (edit: boolean) =>
  CheckinCardPage({
    params: Promise.resolve({ cohortId: COHORT, session: '1' }),
    searchParams: Promise.resolve(edit ? { edit: '1' } : {}),
  }) as Promise<ReactElement>;

describe('갈무리 카드 — ?edit=1 이 편집을 연다', () => {
  it('전제: 제출분은 읽기로 열리고 ?edit=1 이면 편집이다 — 판정 자체는 옳다', () => {
    // 결함이 판정(mode.ts)에 있는 것이 아님을 먼저 못 박는다. 순수 함수는 정확하다.
    const base = { closed: false, existing: { submittedAt: SUBMITTED.submittedAt, hasContent: true } };
    expect(resolveCheckinMode({ ...base, wantsEdit: false })).toBe('read');
    expect(resolveCheckinMode({ ...base, wantsEdit: true })).toBe('edit');
  });

  it('서버가 모드를 정확히 내려보낸다 — prop 은 맞다', async () => {
    const read = find(await render(false));
    const edit = find(await render(true));
    expect((read?.props as { initialMode: string }).initialMode).toBe('read');
    expect((edit?.props as { initialMode: string }).initialMode).toBe('edit');
  });

  it('**읽기 카드와 편집 카드가 서로 다른 인스턴스여야 한다**', async () => {
    // 여기가 급소다. prop 이 맞아도 `useState(initialMode)` 는 첫 값만 쓴다.
    //   같은 인스턴스로 재사용되면 '수정하기'를 눌러도 mode 가 'read' 에 머문다 —
    //   그리고 setMode('edit') 로 가는 클릭 경로가 없으므로 되돌릴 길도 없다.
    const read = find(await render(false));
    const edit = find(await render(true));
    expect(read, '카드가 트리에 있다').not.toBeNull();
    expect(read?.key, 'key 가 없으면 React 가 상태를 재사용한다').not.toBeNull();
    expect(edit?.key).not.toBe(read?.key);
  });

  it('key 가 모드를 포함한다 — 회차만으로는 ?edit=1 전환을 가르지 못한다', async () => {
    const read = find(await render(false));
    const edit = find(await render(true));
    // 같은 차수·같은 회차이므로, 둘을 가르는 것은 모드뿐이다.
    expect(String(read?.key)).toContain('read');
    expect(String(edit?.key)).toContain('edit');
  });
});
