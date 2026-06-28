// 로그인 결과 + 역할 → 다음 행로(순수 함수, 앱층 — 계약 아님). 비밀번호·토큰은 다루지 않는다.
// 자격 오류/세션 없음 → 담담한 에러. 코치·운영자 → /coach, 참여자 → /.
import type { Role } from '@/contracts';

export interface LoginOutcome {
  redirect?: string;
  error?: string;
}

export function loginOutcome(input: { error: unknown; hasSession: boolean; role: Role | null }): LoginOutcome {
  if (input.error || !input.hasSession) {
    return { error: '이메일 또는 비밀번호를 확인해 주세요.' };
  }
  return { redirect: input.role === 'admin' || input.role === 'coach' ? '/coach' : '/' };
}
