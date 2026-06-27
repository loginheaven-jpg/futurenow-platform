// 순수 권한 판정 로직 (DB 비의존 — 단위테스트 대상). 코어측 1차 방어.
// DB RLS 가 2차 방어다(이중 방어). 두 층이 같은 규칙을 강제한다.
import type { Role } from '@/contracts';

const RANK: Record<Role, number> = { user: 1, coach: 2, admin: 3 };

/** actual 역할이 required 이상인가(계층: user < coach < admin). */
export function satisfiesRole(actual: Role, required: Role): boolean {
  return RANK[actual] >= RANK[required];
}

/** 전화번호 등 민감 채널 접근 가부: 본인 또는 운영자만(ADR-04). 코치·타인 차단. */
export function canAccessContact(actor: { id: string; role: Role }, targetUserId: string): boolean {
  return actor.id === targetUserId || actor.role === 'admin';
}
