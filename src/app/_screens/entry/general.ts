// general 공개 체험 진단 상수(트랙 D·ADR-63). 세미나 코드 없이 로그인 사용자가 체험하는 예약 차수의 코드.
//   DB 마이그(20260702131316 — cohorts_code_check 예약어 + general 시드)와 **반드시 일치**한다.
//   앱 전 사용처(진입 딥링크·isGeneral 판정)를 이 상수 1곳으로 격리 — 문자열 교체 시 여기 + 새 마이그만 손댄다.
export const GENERAL_CODE = 'JOINF';
