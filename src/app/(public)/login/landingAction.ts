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
    // ★ **둘을 함께 기다린다**(ADR-176). `listMyCohorts` 는 `me` 를 인자로 쓰지 않는다 —
    //   직렬로 두면 **왕복 하나가 통째로 줄을 선다.** 이 액션은 홈 착지 경로에만 붙고
    //   실측으로 그 경로가 딥링크보다 정확히 이만큼 느렸다(2026-09-02 · 서버액션 290ms).
    //   **미인증이면 회기 조회가 헛돈다** — 그러나 그 경우는 곧 `/home` 이고,
    //   RLS 가 본인 것만 내주므로 남의 것을 당겨오지 않는다. 인증 게이트는 프록시가 이미 지났다.
    const [me, cohorts] = await Promise.all([
      ctx.currentUser(),
      ctx.listMyCohorts().catch(() => []),
    ]);
    if (!me) return '/home';
    return landingFor(roleTargets(me.role, cohorts)) ?? '/home';
  } catch {
    return '/home';
  }
}
