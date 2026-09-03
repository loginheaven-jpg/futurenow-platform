// 회원 상태 표시·조작 판정 — **순수 함수** (5-3).
//
// **화면이 계산하지 않는다**(발주 §6). 서버가 내린 `memberState` 를 받아
//   ⑴ 어떤 이름으로 부를지 ⑵ 어떤 버튼이 눌리는지를 여기서 정한다.
//   화면은 이 결과를 그리기만 하고, 테스트는 화면 없이 이 함수를 잰다.
//
// **서버 가드를 대신하지 않는다**(발주 §4). 여기 판정은 **안내**이고,
//   실제 문은 `decide_membership` 의 가드 넷이다(5-2). 화면에서 버튼을 감추는 것은
//   안전장치가 아니다 — 그래서 **감추지 않고 비활성 + 사유**로 둔다.
//   *안 보이면 왜 없는지 모른다.*
import type { MemberState, Role } from '@/contracts';
import { TIER_LABEL, HELD_ADMIN_LABEL } from '@/core/membershipVocab';

/** 목록 행에 뜨는 회원 상태 이름 — **단일 출처 어휘를 그대로 쓴다.** */
export function memberStateLabel(state: MemberState): string {
  switch (state) {
    case 'individual':
      return TIER_LABEL.forum;
    case 'expired':
      return TIER_LABEL.suspended;
    case 'held':
      // **열에는 문장이 아니라 이름이 들어간다.** 참여자가 읽는 문장(`확인이 필요한 신청입니다`)을
      //   그대로 쓰면 열 하나가 문장이 된다 — 실제로 캡처에서 그렇게 나왔다.
      //   운영자 어휘로는 승인 화면 버튼 이름 `확인 대기` 가 이미 확정돼 있다(최박사 2026-08-29).
      return HELD_ADMIN_LABEL;
    case 'cohort':
      // 차수 회원은 **산출**이라 자격 이름이 아니다 — 소속이 곧 상태다.
      return '회기 참여 중';
    case 'pending':
    default:
      return TIER_LABEL.visitor;
  }
}

export interface ActionGate {
  /** 눌리는가. 막혀도 **감추지 않는다** — 사유가 보여야 왜 없는지 안다. */
  enabled: boolean;
  /** 막힌 이유. 눌리면 `null`. **새 문장을 짓지 않는다** — 아래 상수를 쓴다. */
  reason: string | null;
}

/** 막힘 사유 — 서버 가드의 문장을 화면 어휘로 옮긴 것이고 새로 짓지 않았다. */
export const REASON_SELF = '자기 자신은 바꿀 수 없습니다.';
export const REASON_SUPER_TARGET = '슈퍼어드민은 바꿀 수 없습니다.';
export const REASON_SUPER_ONLY = '슈퍼어드민만 하실 수 있습니다.';

export interface GateInput {
  /** 대상 */
  target: { id: string; role: Role; memberState: MemberState; isSuperAdmin: boolean };
  /** 누른 사람 */
  actor: { id: string; isSuperAdmin: boolean };
}

/**
 * **보류** 버튼 — 서버 가드 넷을 그대로 비춘다(5-2 `decide_membership`).
 *   자기 자신 · 슈퍼어드민 대상 · 운영자 대상인데 누른 사람이 슈퍼어드민이 아님.
 */
export function holdGate({ target, actor }: GateInput): ActionGate {
  if (target.id === actor.id) return { enabled: false, reason: REASON_SELF };
  if (target.isSuperAdmin) return { enabled: false, reason: REASON_SUPER_TARGET };
  if (target.role === 'admin' && !actor.isSuperAdmin) return { enabled: false, reason: REASON_SUPER_ONLY };
  return { enabled: true, reason: null };
}

/**
 * **승급** 버튼 — `individual` 로 올린다.
 *
 * ★ **보류된 사람에게 승급을 누르면 그것이 해제다**(최박사 확정).
 *   그래서 `expired` 인 행에서도 **활성**이어야 한다. 별도 「해제」를 만들지 않는다 —
 *   같은 일을 하는 길이 둘이 되면 한쪽만 고쳐지는 날이 온다.
 *
 * 운영자 대상 제한을 걸지 않는다 — 서버가 막는 것은 **보류**이지 승급이 아니다
 *   (`decide_membership` 은 `expired` 에만 슈퍼어드민을 요구한다). 되돌리는 길을 좁히지 않는다.
 */
export function promoteGate({ target, actor }: GateInput): ActionGate {
  if (target.id === actor.id) return { enabled: false, reason: REASON_SELF };
  if (target.isSuperAdmin) return { enabled: false, reason: REASON_SUPER_TARGET };
  return { enabled: true, reason: null };
}
