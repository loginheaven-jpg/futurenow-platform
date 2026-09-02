// 로그인 결과 → 다음 행로(순수 함수, 앱층 — 계약 아님). 비밀번호·토큰은 다루지 않는다.
// 자격 오류/세션 없음 → 담담한 에러. 세션 성립 시 전원 → /home(A′-1 통합 홈 — 역할 감금 해제).
//   코치·운영자는 홈의 '운영' 진입 카드로 콘솔·본부에 들어간다(콘솔/본부는 자격 게이트가 별도 방어).
//   role 은 행로에 무관(전원 /home) — 인자에서 제거(호출부 currentUser() 왕복 불요, 정합 마감).
export interface LoginOutcome {
  redirect?: string;
  error?: string;
}

import { safeReturnTo } from '@/app/_lib/safeReturn';
import { HOLD_LOGIN_NOTICE } from '@/core/membershipVocab';

/**
 * 계정이 잠긴 것인가 — **auth 오류를 우리 문구로 번역하는 자리**(최박사 확정 2026-08-30).
 *
 * `decide_membership` 이 `expired` 에서 `auth.users.banned_until` 을 세우면
 * GoTrue 가 **`user_banned`** 로 거절한다. 그것을 *이메일 또는 비밀번호를 확인해 주세요* 로
 * 뭉개면 **보류된 사람이 자기 비밀번호를 의심하며 영영 헤맨다.**
 *
 * **`code` 를 먼저 본다**(`user_banned` 는 `@supabase/auth-js` 의 `ErrorCode` 에 실재한다 — 정본 확인).
 *   메시지 문자열은 보조다: 문구는 서버 판마다 바뀔 수 있고 **문자열로만 재면 조용히 깨진다.**
 *   둘 다 보되 **코드가 이기게** 둔다.
 *
 * **원시 에러를 화면에 싣지 않는다**(기존 규율) — 우리가 아는 한 가지만 번역하고 나머지는 그대로 둔다.
 */
function isBanned(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: unknown; message?: unknown };
  if (e.code === 'user_banned') return true;
  return typeof e.message === 'string' && /banned/i.test(e.message);
}

/**
 * 로그인 직후 착지임을 `/home` 에 알리는 표지. **양쪽이 같은 값을 읽는다**(불변식 23) —
 *   한쪽만 고치면 막바로 진입이 조용히 멈추고 아무도 모른다.
 */
export const LOGIN_ENTRY = 'login';

export function loginOutcome(input: { error: unknown; hasSession: boolean; returnTo?: string | null }): LoginOutcome {
  // **잠긴 계정이 먼저다.** 아래 문구로 뭉개면 보류된 사람이 비밀번호를 의심한다.
  if (isBanned(input.error)) {
    return { error: HOLD_LOGIN_NOTICE };
  }
  if (input.error || !input.hasSession) {
    return { error: '이메일 또는 비밀번호를 확인해 주세요.' };
  }
  // ★ **링크가 우선이다**(지휘부 확정 2026-09-02). `returnTo` 가 화이트리스트를 지나면
  //   그쪽이 이긴다 — 알림·QR 로 온 사람이 엉뚱한 데 착지하지 않는다. **이 줄은 안 바뀌었다.**
  //
  //   갈 곳이 따로 없으면 `/home` 인데, **표지를 하나 붙인다**(ADR-173).
  //   거점이 하나뿐인 사람은 홈을 거치지 않고 그리로 간다(지시 case 1·2) —
  //   그 판정은 `/home` 이 `roleTargets` 로 한다. **여기서 역할을 알 수 없기 때문이다**
  //   (이 함수는 순수하고 브라우저에서 돈다).
  //   표지가 없으면 그냥 홈이다 — 그래서 시트의 **「내 홈」을 누르면 홈에 머문다.**
  //   `?from=` 은 이 저장소가 이미 쓰는 관용구다(`/coach/cohort/[id]?from=console`).
  return { redirect: safeReturnTo(input.returnTo) ?? `/home?from=${LOGIN_ENTRY}` };
}
