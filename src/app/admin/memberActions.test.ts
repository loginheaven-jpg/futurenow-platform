import { describe, expect, it } from 'vitest';
import {
  memberStateLabel, holdGate, promoteGate,
  REASON_SELF, REASON_SUPER_TARGET, REASON_SUPER_ONLY,
} from './memberActions';
import { TIER_LABEL, HELD_ADMIN_LABEL, UNDER_REVIEW_NOTE } from '@/core/membershipVocab';

const t = (over: Partial<Parameters<typeof holdGate>[0]['target']> = {}) => ({
  id: 'u1', role: 'user' as const, memberState: 'pending' as const, isSuperAdmin: false, ...over,
});
const a = (over: Partial<Parameters<typeof holdGate>[0]['actor']> = {}) => ({
  id: 'admin1', isSuperAdmin: false, ...over,
});

describe('회원 상태 이름 — **단일 출처 어휘를 그대로 쓴다**', () => {
  it('자격 이름은 `membershipVocab` 에서 온다 — 여기서 짓지 않는다', () => {
    expect(memberStateLabel('individual')).toBe(TIER_LABEL.forum);
    expect(memberStateLabel('expired')).toBe(TIER_LABEL.suspended);
    expect(memberStateLabel('pending')).toBe(TIER_LABEL.visitor);
    // **열에는 이름이 들어간다** — 참여자가 읽는 문장을 그대로 쓰면 열 하나가 문장이 된다.
    expect(memberStateLabel('held')).toBe(HELD_ADMIN_LABEL);
    expect(memberStateLabel('held'), '참여자 문장을 열에 쓰지 않는다').not.toBe(UNDER_REVIEW_NOTE);
  });

  it('`cohort` 는 자격이 아니라 **소속**이다 — 산출값이라 자격 이름을 붙이지 않는다', () => {
    expect(memberStateLabel('cohort')).toBe('회기 참여 중');
    expect(memberStateLabel('cohort')).not.toBe(TIER_LABEL.forum);
  });
});

describe('보류 버튼 — 서버 가드 넷을 비춘다(대신하지 않는다)', () => {
  it('자기 자신은 막힌다', () => {
    expect(holdGate({ target: t({ id: 'admin1' }), actor: a() })).toEqual({ enabled: false, reason: REASON_SELF });
  });

  it('슈퍼어드민은 대상이 될 수 없다 — 잠기면 푸는 사람이 없다', () => {
    expect(holdGate({ target: t({ isSuperAdmin: true }), actor: a({ isSuperAdmin: true }) }))
      .toEqual({ enabled: false, reason: REASON_SUPER_TARGET });
  });

  it('운영자를 보류하는 것은 슈퍼어드민만', () => {
    expect(holdGate({ target: t({ role: 'admin' }), actor: a() }))
      .toEqual({ enabled: false, reason: REASON_SUPER_ONLY });
    expect(holdGate({ target: t({ role: 'admin' }), actor: a({ isSuperAdmin: true }) }).enabled).toBe(true);
  });

  it('**대조군** — 일반 회원은 운영자 누구나 보류한다. 없으면 위 셋이 «아무도 못 한다» 여도 통과한다', () => {
    expect(holdGate({ target: t(), actor: a() })).toEqual({ enabled: true, reason: null });
  });
});

describe('★ 승급이 곧 되돌리기다 (최박사 확정)', () => {
  it('**보류된 사람의 행에서 승급이 활성이다** — 별도 해제를 만들지 않는다', () => {
    expect(promoteGate({ target: t({ memberState: 'expired' }), actor: a() }))
      .toEqual({ enabled: true, reason: null });
  });

  it('보류된 **운영자**도 슈퍼어드민 아닌 사람이 되돌릴 수 있다 — 되돌리는 길을 좁히지 않는다', () => {
    // 서버가 막는 것은 **보류**이지 승급이 아니다(`decide_membership` 은 expired 에만 슈퍼어드민을 요구).
    expect(promoteGate({ target: t({ role: 'admin', memberState: 'expired' }), actor: a() }).enabled).toBe(true);
  });

  it('자기 자신·슈퍼어드민은 승급도 막힌다', () => {
    expect(promoteGate({ target: t({ id: 'admin1' }), actor: a() }).enabled).toBe(false);
    expect(promoteGate({ target: t({ isSuperAdmin: true }), actor: a() }).enabled).toBe(false);
  });
});
