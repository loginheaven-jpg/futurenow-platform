// 회원가입 라우트 — 서버 컴포넌트(force-dynamic, 빌드 env 의존 제거). 스태프·일반 멤버용.
// 참여자 코드 가입은 /join 별도(코드 결속). 계약·DB 무변경(앱층 인증).
import { SignupClient } from './SignupClient';

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  return <SignupClient />;
}
