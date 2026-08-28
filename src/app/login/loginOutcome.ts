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

export function loginOutcome(input: { error: unknown; hasSession: boolean; returnTo?: string | null }): LoginOutcome {
  // **잠긴 계정이 먼저다.** 아래 문구로 뭉개면 보류된 사람이 비밀번호를 의심한다.
  if (isBanned(input.error)) {
    return { error: HOLD_LOGIN_NOTICE };
  }
  if (input.error || !input.hasSession) {
    return { error: '이메일 또는 비밀번호를 확인해 주세요.' };
  }
  // returnTo 는 화이트리스트 통과 상대 경로만(오픈 리다이렉트 방어). 그 외/부재 → /home.
  return { redirect: safeReturnTo(input.returnTo) ?? '/home' };
}
