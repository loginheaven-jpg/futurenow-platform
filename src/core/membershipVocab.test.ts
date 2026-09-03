// 회원 표시 어휘 — **문안이 최박사 원문 그대로인지**를 잠근다 (5차 T-3).
//
// 이 파일이 막는 것은 하나다: **문안을 다듬는 것.**
// *"문안을 좁히지 마라. 진단이 아니라 진단 등 모든 도구다. 최박사 문장이 자네 초안보다 넓다."*
// 다듬으면 다음 사람이 그것을 원문으로 배운다. 그래서 글자 그대로 박아 둔다.
import { describe, expect, it } from 'vitest';
import type { CohortRole, MembershipStatus } from '@/contracts/domain';
import { MEMBERSHIP_STATUSES } from './membership';
import {
  cohortRoleLabel,
  isMoreRecent,
  narrowLabel,
  shortCohortName,
  UPGRADE_HOWTO,
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
    // **대체됐다**(최박사 위임 · 지휘부 작성 2026-08-30) — 방문회원은 기다리는 사람이 아니라
    //   아직 아무것도 하지 않은 사람이라 `기다리는 중` 이 사실과 어긋났다.
    expect(TIER_LEAD.visitor).toBe(
      '세미나에 참여하시는 동안, 또는 촉진자포럼에 가입해 포럼회원으로 승인받으시면 진단 등 모든 도구를 이용하실 수 있습니다.',
    );
    // **승인까지 말해야 한다** — *가입하시면* 만 두면 `UPGRADE_HOWTO` 와 조건이 어긋난다.
    expect(TIER_LEAD.visitor).toContain('승인받으시면');
    expect(TIER_LEAD.visitor, '옛 문장이 남으면 안 된다').not.toContain('기다리는 중');
    expect(TIER_LEAD.forum).toBe('포럼회원자격 유지기간 동안 진단 등 모든 도구를 이용하실 수 있습니다.');
    expect(TIER_LEAD.suspended).toBe('이용이 보류되었습니다. 운영자에게 문의해 주십시오.');
  });

  // **잠금의 뜻은 그대로다 — 약속을 좁히지 않는다.** 문자열만 옮겼다.
  //   참여자 줄이 `진단 등 모든 도구` → `모든 도구` 로 바뀌었는데 **좁아진 것이 아니다**
  //   (`진단 등` 은 예시였고 `모든 도구` 가 그것을 포함한다). 그래서 검사를
  //   *`모든 도구` 라고 말하는가* 로 옮긴다. 셋 다 같은 약속을 해야 한다.
  it('**좁히지 않았다** — `진단 하나` 가 아니라 `모든 도구` 다', () => {
    for (const s of [TIER_LEAD.visitor, TIER_LEAD.forum, PARTICIPANT_LEAD]) {
      expect(s).toContain('모든 도구');
      expect(s).not.toMatch(/진단을 이용/);
    }
  });

  it('참여자 설명 · 진행 문안 · 문의 안내', () => {
    // **두 문장이다**(최박사 위임 · 지휘부 작성 2026-08-30). 뒷 문장을 빼면
    //   *기간이 끝나면 기록도 사라진다* 로 읽힌다 — 실제로는 영구 열람이다.
    expect(PARTICIPANT_LEAD).toBe(
      '세미나 기간 동안 모든 도구를 이용하실 수 있습니다. 기간이 끝나도 그동안의 기록은 계속 보실 수 있습니다.',
    );
    expect(PARTICIPANT_LEAD, '기록이 남는다는 말이 빠지면 안 된다').toContain('기록은 계속 보실 수 있습니다');
    // **`만료` 라는 말을 쓰지 않는다** — 자동 만료가 폐지돼 없는 개념을 가리키게 된다.
    for (const s of [TIER_LEAD.visitor, TIER_LEAD.forum, TIER_LEAD.suspended, PARTICIPANT_LEAD]) {
      expect(s, '만료는 폐지된 개념이다').not.toContain('만료');
    }
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

describe('shortCohortName — 이름 끝의 `n기` 를 뽑는다 (최박사 확정 · 가)', () => {
  it('실물 회기명이 줄어든다', () => {
    expect(shortCohortName('퓨처나우2026예봄1기')).toBe('1기');
    expect(shortCohortName('퓨처나우2026예봄2기')).toBe('2기');
  });

  it('두 자리 이상도 뽑는다', () => {
    expect(shortCohortName('퓨처나우2027가을12기')).toBe('12기');
  });

  it('**뽑히지 않는 회기는 전체 이름을 그대로 쓴다** — 규칙이 이름 형식에 의존한다', () => {
    // 실물이다. 억지로 줄이면 없는 회차 번호를 만들어 내게 된다.
    expect(shortCohortName('[QA] 검증 전용')).toBe('[QA] 검증 전용');
    expect(shortCohortName('체험 진단')).toBe('체험 진단');
    expect(shortCohortName('휴지통')).toBe('휴지통');
    expect(shortCohortName('test')).toBe('test');
  });

  it('끝이 아니면 뽑지 않는다 — `2기` 가 이름 가운데 있어도 그대로다', () => {
    expect(shortCohortName('2기 준비모임')).toBe('2기 준비모임');
    expect(shortCohortName('퓨처나우2026예봄2기 보충')).toBe('퓨처나우2026예봄2기 보충');
  });

  it('이미 짧으면 그대로', () => {
    expect(shortCohortName('2기')).toBe('2기');
  });

  it('앞뒤 공백을 다듬고 판정한다', () => {
    expect(shortCohortName('  퓨처나우2026예봄2기  ')).toBe('2기');
  });
});

describe('cohortRoleLabel — 축약된 회기명 + 역할', () => {
  const r = (over: Partial<CohortRole> = {}): CohortRole => ({
    cohortId: 'c1', cohortName: '퓨처나우2026예봄2기', kind: 'participant', firstSessionAt: null, ...over,
  });

  it('`2기 참여자` · `2기 인도자`', () => {
    expect(cohortRoleLabel(r())).toBe('2기 참여자');
    expect(cohortRoleLabel(r({ kind: 'coach' }))).toBe('2기 인도자');
  });

  it('뽑히지 않는 회기는 전체 이름 + 역할', () => {
    expect(cohortRoleLabel(r({ cohortName: '[QA] 검증 전용' }))).toBe('[QA] 검증 전용 참여자');
  });
});

describe('toMembershipView — **자격 저장값**을 표시 축으로 편다', () => {
  // **입력이 저장값이라는 것이 이 절의 전부다.**
  //   처음 판은 `member_state()` 산출값을 넣었고 테스트도 같은 것을 넣어 **초록이었다.**
  //   그래서 승인받은 적 없는 18명이 `포럼회원` 으로 표시되는 것을 아무도 못 봤다.
  //   *초록은 대상이 실재한다는 증거가 아니다* — 여기서는 **입력이 옳다는 증거가 아니었다.**
  const view = (stored: MembershipStatus | null) => toMembershipView(stored, []);

  it.each([
    ['individual' as const, 'forum', false],
    ['expired' as const, 'suspended', false],
    ['pending' as const, 'visitor', false],
    ['held' as const, 'visitor', true],
    [null, 'visitor', false],
  ])('저장값 %s → tier %s · underReview %s', (stored, tier, review) => {
    const v = view(stored);
    expect(v.tier).toBe(tier);
    expect(v.underReview).toBe(review);
  });

  it('**행이 없어도 방문회원이다** — 실측 18명이 그 경우다(세미나 참여 중이지만 승인받은 적 없다)', () => {
    const v = view(null);
    expect(v.tier).toBe('visitor');
    expect(TIER_LABEL[v.tier]).toBe('방문회원');
    expect(TIER_LABEL[v.tier], '승인받은 적 없는 사람을 포럼회원이라 부르지 않는다').not.toBe('포럼회원');
  });

  it('**저장 가능한 값이 전수 덮였다** — DB CHECK 넷 + 행 없음', () => {
    const covered = [...MEMBERSHIP_STATUSES, null];
    expect(MEMBERSHIP_STATUSES).toEqual(['pending', 'individual', 'expired', 'held']);
    for (const stored of covered) expect(() => view(stored)).not.toThrow();
    // `cohort` 는 **저장되지 않는다** — 목록에 없는 것이 그 사실이다.
    expect(MEMBERSHIP_STATUSES as readonly string[]).not.toContain('cohort');
  });

  it('**`held` 가 tier 를 덮지 않는다** — 덮으면 `보류` 가 자격 자리에 앉아 `이용 보류` 와 겹친다', () => {
    const v = view('held');
    expect(v.tier).toBe('visitor');
    expect(TIER_LABEL[v.tier]).toBe('방문회원');
    expect(TIER_LABEL[v.tier]).not.toBe(TIER_LABEL.suspended);
  });

  it('**`participant` 는 tier 값이 아니다** — 택일 축에 여럿이 들어갈 수 없다', () => {
    const tiers = [...MEMBERSHIP_STATUSES, null].map((s) => view(s).tier);
    expect(new Set(tiers)).toEqual(new Set(['visitor', 'forum', 'suspended']));
    expect(tiers).not.toContain('participant');
  });

  it('소속은 받은 그대로 실린다 — 여기서 거르지 않는다', () => {
    const roles: CohortRole[] = [
      { cohortId: 'c1', cohortName: '1기', kind: 'coach', firstSessionAt: null },
      { cohortId: 'c2', cohortName: '2기', kind: 'participant', firstSessionAt: null },
    ];
    expect(toMembershipView(null, roles).cohortRoles).toEqual(roles);
  });

  it('소속이 없으면 빈 배열 — 화면이 그 줄을 안 그린다', () => {
    expect(view('pending').cohortRoles).toEqual([]);
  });

  it('**문자열을 담지 않는다** — 값만 내리고 조립은 화면이 한다', () => {
    const json = JSON.stringify(view('individual'));
    for (const copy of [TIER_LABEL.forum, TIER_LEAD.forum, PARTICIPANT_LEAD, UNDER_REVIEW_NOTE]) {
      expect(json, '서버 값에 문언이 섞이면 단일 출처가 둘이 된다').not.toContain(copy);
    }
  });
});

// ── 최박사 확정 2026-08-30 ──────────────────────────────────────────────
describe('shortCohortName / narrowLabel / 승급 안내 — 확정 반영', () => {
  const role = (over: Partial<CohortRole> = {}): CohortRole => ({
    cohortId: 'c', cohortName: '퓨처나우2026예봄1기', kind: 'participant', firstSessionAt: null, ...over,
  });

  it('승급 방법은 **최박사 원문 그대로**다', () => {
    expect(UPGRADE_HOWTO).toBe('촉진자포럼에 가입하고 정회원자격을 취득하시면 된다.');
  });

  it('**최근 회기는 첫 회차일로 잰다** — 이름 끝의 숫자가 아니다', () => {
    const older = role({ cohortId: '1', cohortName: '퓨처나우2026예봄1기', kind: 'participant', firstSessionAt: '2026-07-26' });
    const newer = role({ cohortId: '2', cohortName: '퓨처나우2026예봄2기', kind: 'coach', firstSessionAt: '2026-09-20' });
    expect(isMoreRecent(newer, older)).toBe(true);
    expect(isMoreRecent(older, newer)).toBe(false);
    // 최박사 예시: `1기참여자 5기운영자` 면 **5기 쪽** 포지션이다.
    expect(narrowLabel([older, newer], false)).toBe('인도자');
  });

  it('이름 끝이 `n기` 가 아닌 회기도 첫 회차일로 갈린다 — 축약 규칙과 무관하다', () => {
    const qa = role({ cohortId: 'q', cohortName: '[QA] 검증 전용', kind: 'coach', firstSessionAt: '2026-08-14' });
    const first = role({ cohortId: '1', cohortName: '퓨처나우2026예봄1기', kind: 'participant', firstSessionAt: '2026-07-26' });
    expect(narrowLabel([first, qa], false)).toBe('인도자'); // QA 가 더 최근
  });

  it('**회차가 없는 회기는 가장 오래된 것으로 친다** — 시작한 적이 없다', () => {
    const noSession = role({ cohortId: 'n', kind: 'coach', firstSessionAt: null });
    const started = role({ cohortId: 's', kind: 'participant', firstSessionAt: '2026-01-01' });
    expect(narrowLabel([noSession, started], false)).toBe('참여자');
  });

  it('소속이 없고 운영자면 운영자다', () => {
    expect(narrowLabel([], true)).toBe('운영자');
  });

  it('**소속도 운영자도 아니면 `null`** — 부르는 쪽이 쓰던 값을 그대로 쓴다', () => {
    expect(narrowLabel([], false)).toBeNull();
  });

  it('소속이 있으면 운영자보다 소속이 앞선다 — 최근 회기 포지션이 규칙이다', () => {
    expect(narrowLabel([role({ firstSessionAt: '2026-01-01' })], true)).toBe('참여자');
  });
});
