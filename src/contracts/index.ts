// /src/contracts — 단일 진입점.
// 코어·진단은 `@/contracts` 에서만 타입을 가져온다(경계 규율 — CLAUDE §1).
// 이 파일은 집약(barrel)일 뿐 계약 형상이 아니다. 형상은 domain/core-context/instrument 에 있다.

export type * from './domain';
export type * from './core-context';
export type * from './instrument';
export type * from './ai';
