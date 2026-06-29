// 가입 결과 → 다음 행로(순수 함수, 앱층). 비밀번호·토큰은 다루지 않는다.
// 세션 반환(이메일 확인 off) → 홈. 세션 없음(확인 필요) → 안내. 오류 → 담담한 에러.
export interface SignupOutcome {
  redirect?: string;
  notice?: string;
  error?: string;
}

export function signupOutcome(input: { error: unknown; hasSession: boolean }): SignupOutcome {
  if (input.error) {
    return { error: '가입에 실패했어요. 이메일 형식과 비밀번호(6자 이상)를 확인해 주세요.' };
  }
  if (!input.hasSession) {
    return { notice: '가입을 마치려면 이메일을 확인해 주세요. 받은 메일의 링크를 누르면 완료됩니다.' };
  }
  return { redirect: '/' };
}
