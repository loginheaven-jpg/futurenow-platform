// 한 렌더 안에서 같은 것을 두 번 묻지 않는다 (ADR-178).
//
// ★ **서버 렌더 전용이다.** `server-only` 패키지를 들이지 않았다 — 저장소에 없고
//   그것 하나 때문에 의존을 늘리지 않는다. 대신 **잠금이 `'use client'` 파일의 수입을 막는다**
//   (`requestScope.test.ts`). 어차피 `createServerContext` 가 `cookies()`·`headers()` 를 읽으므로
//   브라우저에서는 돌지 않지만, **막는 이유는 그것이 아니라** 클라이언트 빌드의 `cache` 가
//   **조용히 통과**하기 때문이다 — 안 도는 것보다 **도는 척하는 것**이 나쁘다.
//
// **무엇이 문제였나**: 회원 껍데기(`(member)/layout.tsx`)와 그 아래 화면이 **각자**
//   `createServerContext()` 를 부른다. `CoreContext` 의 `currentUser` 메모는 **인스턴스 필드**라
//   인스턴스가 둘이면 듣지 않는다 — 그래서 착지 한 번에 `users` SELECT · 동의 · 차수가
//   **두 벌씩** 돈다. 그 파일의 주석은 「CoreContext 는 요청마다 새로 생성 → 인스턴스 캐시 = 요청 단위」
//   라고 적지만 **팩토리가 호출 단위**라 사실이 아니다.
//
// ★ **왜 core 가 아니라 여기인가**(정본 확인 2026-09-02):
//   ⑴ `src/core/context.ts` 는 **서버·클라이언트 공용**이다(`ConsentGate`·`SignupClient` 등이
//      브라우저에서 `createCoreContext` 를 만든다). 클라이언트 빌드의 `cache` 는 **경고도 에러도 없이
//      순수 통과**라(`react/cjs/react.development.js`), 인스턴스 메모를 `cache()` 로 옮기면
//      서버는 묶이고 **브라우저는 메모를 통째로 잃는다.** 타입으로도 초록으로도 안 잡힌다.
//   ⑵ `createServerContext(options)` 는 **인자를 받는다.** 인자를 떨어뜨린 래퍼를 core 에 두면
//      `join/actions.ts` 가 넘기는 `validators` 가 사라지는데, `validateWith` 는 스키마가 없으면
//      **예외도 로그도 없이 원값을 통과**시킨다 — §9 zod 경계가 **초록인 채로** 비어 버린다.
//   그래서 core 를 한 글자도 안 고치고, **읽기만 하는 앱 층 로더**를 따로 둔다.
//
// ★ **메모의 범위는 「요청」이 아니라 「렌더 패스」다**(정본 확인). 서버 액션과 라우트 핸들러에서는
//   메모가 **아예 안 된다**(Flight Request 가 없다). 그래서 여기 있는 것은 **렌더 경로 전용**이고,
//   변이 뒤 재조회가 옛 값을 보는 사고(피드·소식 액션 여섯)는 **여기에 닿지 않는다.**
//   같은 이유로 **부수효과를 이 안에 두지 않는다** — 에러 재렌더는 같은 HTTP 요청에서 두 번 돈다.
import { cache } from 'react';
import { createServerContext } from '@/core/supabase/server';

/**
 * 이 렌더의 컨텍스트 하나. **인자를 받지 않는다** — 받는 순간 위 ⑵ 가 살아난다.
 * `validators` 가 필요한 자리(`join/actions.ts`)는 **여기를 쓰지 않고** 직접 만든다.
 */
export const requestContext = cache(async () => createServerContext());

/** 지금 사람. 렌더당 `users` SELECT 한 번. */
export const requestUser = cache(async () => (await requestContext()).currentUser());

/** 동의 이력. 껍데기와 화면이 **똑같이** 삼키던 것이라 여기서 한 번에 삼킨다. */
export const requestConsents = cache(async () =>
  (await requestContext()).listMyConsents().catch(() => []),
);

/**
 * 내 차수. **여기서 삼키지 않는다** — 껍데기는 삼키고 홈은 안 삼켰다.
 *   그 차이를 부르는 자리에 그대로 남긴다(성질을 파생하지 않는다).
 *
 * ★ **알고 받아들인 것 하나**: `cache()` 는 성공값뿐 아니라 **거절도 메모한다.**
 *   전에는 화면이 새 컨텍스트로 다시 시도해 우연히 회복되는 경우가 있었는데 이제 없다.
 *   대신 **실패가 한 번으로 끝나고 정직하게 드러난다** — 조용히 두 번 두드리지 않는다.
 */
export const requestCohorts = cache(async () => (await requestContext()).listMyCohorts());
