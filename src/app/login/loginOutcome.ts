// 로그인 결과 → 다음 행로(순수 함수, 앱층 — 계약 아님). 비밀번호·토큰은 다루지 않는다.
// 자격 오류/세션 없음 → 담담한 에러. 세션 성립 시 전원 → /home(A′-1 통합 홈 — 역할 감금 해제).
//   코치·운영자는 홈의 '운영' 진입 카드로 콘솔·본부에 들어간다(콘솔/본부는 자격 게이트가 별도 방어).
//   role 은 행로에 무관(전원 /home) — 인자에서 제거(호출부 currentUser() 왕복 불요, 정합 마감).
export interface LoginOutcome {
  redirect?: string;
  error?: string;
}

import { safeReturnTo } from '@/app/_lib/safeReturn';

export function loginOutcome(input: { error: unknown; hasSession: boolean; returnTo?: string | null }): LoginOutcome {
  if (input.error || !input.hasSession) {
    return { error: '이메일 또는 비밀번호를 확인해 주세요.' };
  }
  // returnTo 는 화이트리스트 통과 상대 경로만(오픈 리다이렉트 방어). 그 외/부재 → /home.
  return { redirect: safeReturnTo(input.returnTo) ?? '/home' };
}
