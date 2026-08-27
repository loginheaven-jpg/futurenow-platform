// 회원 상태 경계 — **판정이 아니라 검증**이다(S-1 · ADR-122).
//
// 우선순위(held > cohort > 저장 > pending)와 만료 산출은 `member_state()` **SQL 한 곳**에만 있다.
//   여기 있는 것은 그 결과가 계약 안의 값인지 확인하는 문지기뿐이다 — 값의 뜻을 해석하지 않고
//   집합 소속만 본다. 이 파일에 분기가 늘어나기 시작하면 판정이 두 곳으로 갈라지는 신호다.
//
// context.ts 안에 두지 않고 떼어 낸 이유: 모듈 전용 함수라 테스트가 닿지 못했다(단계 2·3 자진 신고).
import type { MemberState } from '@/contracts/domain';
import { CoreError } from './errors';

export const MEMBER_STATES: readonly MemberState[] = ['pending', 'individual', 'cohort', 'expired', 'held'];

/** DB 가 계약 밖 값을 내면 조용히 오타입으로 흐르지 않고 여기서 멈춘다(CLAUDE §9 — 코드 경계는 엄격). */
export function toMemberState(v: unknown): MemberState {
  if (typeof v === 'string' && (MEMBER_STATES as readonly string[]).includes(v)) return v as MemberState;
  throw new CoreError(`member_state 응답이 계약 밖입니다: ${String(v)}`);
}
