'use server';
// 로그인 직후 착지 조회 (ADR-173).
//
// ★ **왜 서버 액션인가.** 처음에는 `/home?from=login` 으로 보내고 **`/home` 이 서버에서
//   `redirect()`** 하게 만들었다. 배포해서 재 보니 **화면이 「불러오는 중…」에서 멈췄다** —
//   `router.replace()` 로 들어온 뒤 서버 컴포넌트가 다시 리다이렉트하자
//   `loading.tsx` 가 뜬 채 클라이언트 라우터가 따라가지 못했다.
//   `/home` 도 `/coach` 도 **직접 열면 멀쩡했다** — 리다이렉트 그 자체가 멈춘 것이다.
//
//   그래서 **리다이렉트를 없앴다.** 갈 곳을 먼저 묻고 한 번만 이동한다.
//   부수 이득 셋 — URL 에 `?from=login` 이 안 남고, `/home` 이 분기를 안 갖고,
//   되돌아오는 사람이 홈에 그냥 머문다.
//
// **판정은 여전히 한 곳이다** — `landingFor(roleTargets(...))` 를 그대로 부른다.
//   여기서 규칙을 다시 쓰지 않는다(불변식 23).
import { createServerContext } from '@/core/supabase/server';
import { roleTargets, landingFor } from '@/app/(member)/home/roleTarget';

/**
 * 거점이 하나뿐이면 그 주소를, 아니면 `/home` 을 돌려준다.
 *
 * **실패해도 막지 않는다** — 조회가 어긋나면 홈으로 보낸다.
 *   로그인은 앱의 현관이고, 여기서 막히면 아무 데도 못 간다.
 */
export async function loginLandingAction(): Promise<string> {
  try {
    const ctx = await createServerContext();
    const me = await ctx.currentUser();
    if (!me) return '/home';
    const cohorts = await ctx.listMyCohorts().catch(() => []);
    return landingFor(roleTargets(me.role, cohorts)) ?? '/home';
  } catch {
    return '/home';
  }
}
