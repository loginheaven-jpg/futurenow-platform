// 회원 표시 어휘 — **문안이 최박사 원문 그대로인지**를 잠근다 (5차 T-3).
//
// 이 파일이 막는 것은 하나다: **문안을 다듬는 것.**
// *"문안을 좁히지 마라. 진단이 아니라 진단 등 모든 도구다. 최박사 문장이 자네 초안보다 넓다."*
// 다듬으면 다음 사람이 그것을 원문으로 배운다. 그래서 글자 그대로 박아 둔다.
import { describe, expect, it } from 'vitest';
import type { CohortRole, MemberState } from '@/contracts/domain';
import {
  cohortRoleLabel,
  COHORT_ROLE_LABEL,
  HELD_MEANING,
  PARTICIPANT_LEAD,
  TIER_INQUIRY_NOTE,
  TIER_LABEL,
  TIER_LEAD,
  toMembershipView,
  UNDER_REVIEW_NOTE,
} from './membershipVocab';

describe('문안 — 최박사 원문 그대로 (한 글자도 다듬지 않는다)', () => {
  it('tier 이름 셋', () => {
    expect(TIER_LABEL.visitor).toBe('방문회원');
    expect(TIER_LABEL.forum).toBe('포럼회원');
    // 한때 *이용 중지* 로 정해졌다가 최박사가 되돌리셨다 — 더 완곡해서 좋다는 것이다.
    expect(TIER_LABEL.suspended).toBe('이용 보류');
    expect(TIER_LABEL.suspended).not.toBe('이용 중지');
  });

  it('tier 별 한 줄 설명', () => {
    expect(TIER_LEAD.visitor).toBe('승인을 기다리는 중입니다. 세미나 참여와 포럼회원 신청을 하실 수 있습니다.');
    expect(TIER_LEAD.forum).toBe('포럼회원자격 유지기간 동안 진단 등 모든 도구를 이용하실 수 있습니다.');
    expect(TIER_LEAD.suspended).toBe('계정 이용이 보류되었습니다. 문의해 주세요.');
  });

  it('**좁히지 않았다** — `진단` 이 아니라 `진단 등 모든 도구` 다', () => {
    for (const s of [TIER_LEAD.forum, PARTICIPANT_LEAD]) {
      expect(s).toContain('진단 등 모든 도구');
      expect(s).not.toMatch(/진단을 이용/);
    }
  });

  it('참여자 설명 · 진행 문안 · 문의 안내', () => {
    expect(PARTICIPANT_LEAD).toBe('세미나 기간 동안 진단 등 모든 도구를 이용하실 수 있습니다.');
    // 참여자 문안은 **현행 유지** — `/pending` 과 같은 문장이다.
    expect(UNDER_REVIEW_NOTE).toBe('확인이 필요한 신청입니다.');
    expect(TIER_INQUIRY_NOTE).toContain('운영자에게 문의');
  });

  it('소속 역할 이름 둘', () => {
    expect(COHORT_ROLE_LABEL.participant).toBe('참여자');
    expect(COHORT_ROLE_LABEL.coach).toBe('인도자');
  });

  it('**`held` 의 뜻이 한 줄로 있다** — 세 자리에 흩어져 있던 것을 모았다', () => {
    expect(HELD_MEANING).toContain('자격 확인이 끝나지 않아');
    expect(HELD_MEANING).toContain('운영자만 손으로');
    expect(HELD_MEANING).toContain('expired');
  });
});

describe('cohortRoleLabel — 기수명을 **그대로** 쓴다', () => {
  const r = (over: Partial<CohortRole> = {}): CohortRole => ({
    cohortId: 'c1', cohortName: '퓨처나우2026예봄2기', kind: 'participant', ...over,
  });

  it('기수명 + 역할', () => {
    expect(cohortRoleLabel(r())).toBe('퓨처나우2026예봄2기 참여자');
    expect(cohortRoleLabel(r({ kind: 'coach' }))).toBe('퓨처나우2026예봄2기 인도자');
  });

  it('**줄이지 않는다** — 축약 규칙은 확정에 없고, 지어내면 계열 8번이다', () => {
    // `○○기` 는 자리표시자이고 실제 이름은 길다. 규칙이 정해지면 이 함수 한 곳만 고친다.
    expect(cohortRoleLabel(r())).toContain('퓨처나우2026예봄2기');
    expect(cohortRoleLabel(r())).not.toBe('2기 참여자');
  });
});

describe('toMembershipView — 판정을 표시 축으로 편다 (다시 계산하지 않는다)', () => {
  const view = (s: MemberState) => toMembershipView(s, []);

  it.each([
    ['pending' as const, 'visitor', false],
    ['held' as const, 'visitor', true],
    ['individual' as const, 'forum', false],
    ['cohort' as const, 'forum', false],
    ['expired' as const, 'suspended', false],
  ])('%s → tier %s · underReview %s', (state, tier, review) => {
    const v = view(state);
    expect(v.tier).toBe(tier);
    expect(v.underReview).toBe(review);
  });

  it('**`held` 가 tier 를 덮지 않는다** — 덮으면 `보류` 가 자격 자리에 앉아 `이용 보류` 와 겹친다', () => {
    const v = view('held');
    expect(v.tier).toBe('visitor');
    expect(TIER_LABEL[v.tier]).toBe('방문회원');
    expect(TIER_LABEL[v.tier]).not.toBe(TIER_LABEL.suspended);
  });

  it('**`participant` 는 tier 값이 아니다** — 택일 축에 여럿이 들어갈 수 없다', () => {
    const tiers = (['pending', 'held', 'individual', 'cohort', 'expired'] as const).map((s) => view(s).tier);
    expect(new Set(tiers)).toEqual(new Set(['visitor', 'forum', 'suspended']));
    expect(tiers).not.toContain('participant');
  });

  it('소속은 받은 그대로 실린다 — 여기서 거르지 않는다', () => {
    const roles: CohortRole[] = [
      { cohortId: 'c1', cohortName: '1기', kind: 'coach' },
      { cohortId: 'c2', cohortName: '2기', kind: 'participant' },
    ];
    expect(toMembershipView('cohort', roles).cohortRoles).toEqual(roles);
  });

  it('소속이 없으면 빈 배열 — 화면이 그 줄을 안 그린다', () => {
    expect(view('pending').cohortRoles).toEqual([]);
  });

  it('**문자열을 담지 않는다** — 값만 내리고 조립은 화면이 한다', () => {
    const v = toMembershipView('forum' === 'forum' ? 'individual' : 'individual', []);
    const json = JSON.stringify(v);
    for (const copy of [TIER_LABEL.forum, TIER_LEAD.forum, PARTICIPANT_LEAD, UNDER_REVIEW_NOTE]) {
      expect(json, '서버 값에 문언이 섞이면 단일 출처가 둘이 된다').not.toContain(copy);
    }
  });
});
