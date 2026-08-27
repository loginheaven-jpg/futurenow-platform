// 콘솔 내비 판정 (3차 T-4).
//
// **이 파일이 지키는 것 둘.**
//   ① **참여자에게 콘솔 내비가 가지 않는다**(발주 §5). 화면을 감추는 것이 아니라 항목이 0이어야 한다.
//   ② **현재 항목이 정확히 하나다.** 둘이 켜지면 어디에 있는지 알 수 없고,
//      0이면 사용자가 자기 위치를 잃는다.
import { describe, expect, it } from 'vitest';
import { cohortIdOf, consoleNav, currentHref } from './consoleNav';

const COHORT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const all = (pathname: string, role: 'user' | 'coach' | 'admin') =>
  consoleNav({ role, pathname }).flatMap((g) => g.items);
const current = (pathname: string, role: 'user' | 'coach' | 'admin') =>
  currentHref(consoleNav({ role, pathname }), pathname);

describe('콘솔 내비', () => {
  it('**참여자에게는 항목이 0이다** — 콘솔 전용이다', () => {
    expect(consoleNav({ role: 'user', pathname: '/coach' })).toHaveLength(0);
    expect(consoleNav({ role: 'user', pathname: `/coach/cohort/${COHORT}` })).toHaveLength(0);
  });

  it('운영자만 운영 묶음을 본다', () => {
    const coach = all('/coach', 'coach').map((i) => i.href);
    const admin = all('/coach', 'admin').map((i) => i.href);
    expect(coach).not.toContain('/admin');
    expect(admin).toContain('/admin');
    expect(admin).toContain('/admin/approvals');
  });

  it('**운영자에게도 인도자 묶음을 준다** — 역할로 화면을 가르지 않는다(ADR-51)', () => {
    expect(all('/admin', 'admin').map((i) => i.href)).toContain('/coach');
  });

  it('기수 안에서만 기수 묶음이 나온다 — 밖에서 보이면 어디로 가는지 모른다', () => {
    expect(all('/coach', 'coach').some((i) => i.href.includes('/checkin'))).toBe(false);
    const inside = all(`/coach/cohort/${COHORT}/checkin`, 'coach').map((i) => i.href);
    expect(inside).toContain(`/coach/cohort/${COHORT}`);
    expect(inside).toContain(`/coach/cohort/${COHORT}/checkin`);
    expect(inside, '2차 산출물인 동행도 기수 문맥에 있다').toContain(`/feed?cohort=${COHORT}`);
  });

  it('차수 id 를 경로에서만 읽는다 — 서버 데이터를 기다리지 않는다', () => {
    expect(cohortIdOf(`/coach/cohort/${COHORT}/matrix`)).toBe(COHORT);
    expect(cohortIdOf('/coach/cohorts')).toBeNull();
    expect(cohortIdOf('/coach/cohort/not-a-uuid')).toBeNull();
    expect(cohortIdOf('/admin')).toBeNull();
  });

  it('**현재 항목이 정확히 하나다** — 콘솔 전 경로에서', () => {
    const paths: [string, 'coach' | 'admin'][] = [
      ['/coach', 'coach'],
      ['/coach/cohorts', 'coach'],
      ['/coach/new', 'coach'],
      [`/coach/cohort/${COHORT}`, 'coach'],
      [`/coach/cohort/${COHORT}/checkin`, 'coach'],
      [`/coach/cohort/${COHORT}/checkin/preview`, 'coach'],
      [`/coach/cohort/${COHORT}/matrix`, 'coach'],
      [`/coach/cohort/${COHORT}/values`, 'coach'],
      ['/admin', 'admin'],
      ['/admin/approvals', 'admin'],
    ];
    for (const [p, role] of paths) {
      expect(current(p, role), `${p} — 현재가 정확히 하나여야 한다`).not.toBeNull();
    }
  });

  it('**가장 긴 일치가 이긴다** — 하위 경로가 상위를 켜지 않는다', () => {
    expect(current('/coach/cohorts', 'coach')).toBe('/coach/cohorts');
    expect(current(`/coach/cohort/${COHORT}/checkin`, 'coach')).toBe(`/coach/cohort/${COHORT}/checkin`);
    expect(current(`/coach/cohort/${COHORT}`, 'coach')).toBe(`/coach/cohort/${COHORT}`);
  });

  it('**내비에 없는 화면에서도 위치를 잃지 않는다** — 상위 문맥이 켜진다', () => {
    // 리포트 상세·조원 세로 보기는 내비 항목이 아니다. exact 로 갈랐다면 아무것도 안 켜져
    //   사용자가 자기 위치를 잃는다. 긴 일치라 '기수 대시보드'가 남는다.
    expect(current(`/coach/cohort/${COHORT}/report/rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr`, 'coach'))
      .toBe(`/coach/cohort/${COHORT}`);
    expect(current(`/coach/cohort/${COHORT}/member/uuuuuuuu-uuuu-uuuu-uuuu-uuuuuuuuuuuu`, 'coach'))
      .toBe(`/coach/cohort/${COHORT}`);
    expect(current(`/coach/cohort/${COHORT}/checkin/preview`, 'coach'), '회차 갈무리 하위도 그 항목에 붙는다')
      .toBe(`/coach/cohort/${COHORT}/checkin`);
  });

  it('세그먼트 경계를 지킨다 — /coach 가 /coaching 을 켜지 않는다', () => {
    expect(current('/coaching', 'coach')).toBeNull();
  });
});
