// 신원 필수성 정책 (진단×역할). architecture §5.2 표.
// futurenow 한정 강화(UX통합가입, 2026-07-01): 참여자도 이름(또는 별명) 필수 — 코치 명단 식별을 위해.
//   코어 ADR-03 은 반전하지 않는다(CoreUser.name 은 여전히 nullable). 필수성은 이 정책 데이터 + 폼 게이트로만 강제.
// 코치는 이름·전화 필수. 운영자는 이름 필수.
import type { IdentityPolicy } from '@/contracts';

export const futurenowIdentityPolicy: IdentityPolicy = {
  byRole: {
    user: { name: 'required', phone: 'optional' },
    coach: { name: 'required', phone: 'required' },
    admin: { name: 'required', phone: 'optional' },
  },
};
