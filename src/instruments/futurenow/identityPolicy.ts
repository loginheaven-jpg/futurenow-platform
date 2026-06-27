// 신원 필수성 정책 (진단×역할). architecture §5.2 표. 코어가 강제.
// 참여자(user)에게 실명·전화 강제하지 않음(권장). 코치는 둘 다 필수. 운영자는 이름 필수.
import type { IdentityPolicy } from '@/contracts';

export const futurenowIdentityPolicy: IdentityPolicy = {
  byRole: {
    user: { name: 'optional', phone: 'optional' },
    coach: { name: 'required', phone: 'required' },
    admin: { name: 'required', phone: 'optional' },
  },
};
