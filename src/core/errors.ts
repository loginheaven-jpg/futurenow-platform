// 코어 오류 타입. 권한·검증·부재를 구분해 호출측이 적절히 처리하도록 한다.

export class CoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CoreError';
  }
}

/** 인증이 필요하거나 세션 선행조건 위반(예: requireRole 전에 currentUser 미호출). */
export class CoreAuthError extends CoreError {
  constructor(message = '인증이 필요합니다') {
    super(message);
    this.name = 'CoreAuthError';
  }
}

/** 인증은 됐으나 권한 부족(역할·소유권). */
export class CoreForbiddenError extends CoreError {
  constructor(message = '권한이 없습니다') {
    super(message);
    this.name = 'CoreForbiddenError';
  }
}

/** 대상 리소스 없음 또는 RLS 로 비가시. */
export class CoreNotFoundError extends CoreError {
  constructor(message = '대상을 찾을 수 없습니다') {
    super(message);
    this.name = 'CoreNotFoundError';
  }
}

/** 경계(zod) 검증 실패. */
export class CoreValidationError extends CoreError {
  readonly issues?: unknown;
  constructor(message: string, issues?: unknown) {
    super(message);
    this.name = 'CoreValidationError';
    this.issues = issues;
  }
}
