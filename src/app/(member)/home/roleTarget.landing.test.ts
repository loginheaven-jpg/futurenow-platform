// 로그인 후 착지 잠금 (ADR-173 · 지휘부 지시 2026-09-02).
//
// **순수 함수라 실행으로 잰다.** 「규칙이 코드에 있는가」가 아니라 **먹여서 나온 값**을 본다 —
//   「있는가」로 묻는 잣대는 의심 대상이다(조항 ⑬).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { MyCohortSummary } from '@/contracts';
import { roleTargets, landingFor } from './roleTarget';
import { loginOutcome, LOGIN_ENTRY } from '@/app/(public)/login/loginOutcome';

/** 차수 하나 — 착지 판정에 쓰이는 칸만 채운다. 나머지는 이 잠금이 보지 않는다. */
const cohort = (over: Partial<MyCohortSummary> = {}): MyCohortSummary =>
  ({
    cohortId: 'c1', name: '예봄 2기', status: 'active',
    openSessionNo: null, openSessionSubmitted: false, openSessionHasContent: false,
    ...over,
  } as MyCohortSummary);

const NONE: MyCohortSummary[] = [];

describe('★ 역할 카드 — 지시 case 1~4', () => {
  it('case 1 · 참여자(기수 하나) — 카드 한 장', () => {
    const t = roleTargets('user', [cohort()]);
    expect(t).toHaveLength(1);
    expect(t[0].href).toBe('/my/cohorts/c1');
  });

  it('case 2 · 인도자(기수 없음) — 카드 한 장', () => {
    const t = roleTargets('coach', NONE);
    expect(t).toHaveLength(1);
    expect(t[0].href).toBe('/coach');
  });

  it('case 3 · 인도자 + 참여자 — 카드 둘, 인도자가 먼저', () => {
    const t = roleTargets('coach', [cohort()]);
    expect(t.map((x) => x.href)).toEqual(['/coach', '/my/cohorts/c1']);
  });

  it('★★ case 4 · 운영자 — **인도자 카드가 선다**', () => {
    // 이것이 이번 회차에서 더한 것이다. 권한은 전부터 있었고(운영자가 콘솔에서 전 차수를 본다)
    //   `role` 이 단일값이라 홈에 그 길만 없었다.
    const t = roleTargets('admin', [cohort()]);
    expect(t.map((x) => x.href)).toEqual(['/admin', '/coach', '/my/cohorts/c1']);
    const coachCard = t[1];
    // `who` 는 이 카드에서 언제나 「인도자」다 — 참여자 카드가 역할과 무관하게 「참여자」인 것과 같다.
    expect(coachCard.who).toBe('인도자');
    // `sub` 만 갈린다 — 운영자는 자기 차수가 아니라 전부를 본다.
    expect(coachCard.sub).toBe('모든 차수를 봅니다.');
    expect(roleTargets('coach', NONE)[0].sub).toBe('내 차수와 조원을 봅니다.');
  });

  it('기수 없는 운영자도 카드 둘이다 — 홈에서 고른다', () => {
    expect(roleTargets('admin', NONE).map((x) => x.href)).toEqual(['/admin', '/coach']);
  });
});

describe('★★ 착지 — 거점이 하나뿐일 때만 홈을 건너뛴다', () => {
  it('case 1·2 — 카드 한 장이면 그리로 간다', () => {
    expect(landingFor(roleTargets('user', [cohort()]))).toBe('/my/cohorts/c1');
    expect(landingFor(roleTargets('coach', NONE))).toBe('/coach');
  });

  it('case 3·4 — 카드가 여럿이면 홈에 남는다', () => {
    expect(landingFor(roleTargets('coach', [cohort()])), '겸직인데 건너뛰었다').toBeNull();
    expect(landingFor(roleTargets('admin', [cohort()])), '운영자인데 건너뛰었다').toBeNull();
    expect(landingFor(roleTargets('admin', NONE))).toBeNull();
  });

  it('★ 기수 없는 참여자는 **건너뛰지 않는다** — 폴백은 거점이 아니다', () => {
    const t = roleTargets('user', NONE);
    expect(t).toHaveLength(1);
    expect(t[0].fallback, '폴백 표시가 없다 — 그러면 착지 규칙이 유추를 하게 된다').toBe(true);
    // 여기서 건너뛰면 자기 자리가 아닌 곳에 떨어지고 홈의 소식·서가를 영영 못 본다.
    expect(landingFor(t), '폴백으로 건너뛰었다').toBeNull();
  });

  it('★ 폴백을 **`href` 로 유추하지 않는다** — 성질을 파생하면 U-4 형태다', () => {
    // 같은 목적지라도 폴백 표시가 없으면 거점으로 본다. 판정 근거가 주소가 아니라 **표시**여야 한다.
    expect(landingFor([{ href: '/home/assessments', who: 'x', title: 't', ctaLabel: 'c' }]))
      .toBe('/home/assessments');
    expect(landingFor([{ href: '/home/assessments', who: 'x', title: 't', ctaLabel: 'c', fallback: true }]))
      .toBeNull();
  });

  it('빈 목록이면 홈에 남는다', () => {
    expect(landingFor([])).toBeNull();
  });
});

describe('★★ 링크가 우선이다 (지휘부 확정 2026-09-02)', () => {
  const ok = { error: null, hasSession: true };

  it('`returnTo` 가 있으면 그쪽으로 간다 — 막바로 진입이 덮지 않는다', () => {
    expect(loginOutcome({ ...ok, returnTo: '/home/assessments' }).redirect).toBe('/home/assessments');
    expect(loginOutcome({ ...ok, returnTo: '/my/values' }).redirect).toBe('/my/values');
  });

  it('갈 곳이 없으면 홈으로 가되 **표지를 단다**', () => {
    expect(loginOutcome({ ...ok, returnTo: null }).redirect).toBe(`/home?from=${LOGIN_ENTRY}`);
  });

  it('★ 화이트리스트 밖 주소는 여전히 막힌다 — 오픈 리다이렉트 방어가 살아 있다', () => {
    for (const bad of ['https://evil.test', '//evil.test', '/admin', '\\\\evil']) {
      expect(loginOutcome({ ...ok, returnTo: bad }).redirect, bad).toBe(`/home?from=${LOGIN_ENTRY}`);
    }
  });

  it('★ 표지는 **양쪽이 같은 값을 읽는다** (불변식 23)', () => {
    // 한쪽만 고치면 막바로 진입이 조용히 멈추고 아무도 모른다.
    const home = readFileSync('src/app/(member)/home/page.tsx', 'utf8');
    expect(home, '홈이 표지를 상수로 읽지 않는다').toContain('LOGIN_ENTRY');
    expect(home, '홈이 표지 값을 손으로 박았다').not.toContain("=== 'login'");
  });
});
