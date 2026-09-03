// 콘솔 내비 판정 (3차 T-4 · U-6 로 개정).
//
// **이 파일이 지키는 것 둘.**
//   ① **참여자에게 콘솔 항목이 가지 않는다**(발주 §5). 화면을 감추는 것이 아니라 항목이 0이어야 한다.
//   ② **현재 항목이 정확히 하나다.** 둘이 켜지면 어디에 있는지 알 수 없고,
//      0이면 사용자가 자기 위치를 잃는다.
//
// ★ **U-6 이 `consoleNav()` 를 걷었다** — 런타임 호출자가 0이었고 시트와 사본 둘이었다.
//   그래서 잣대를 **살아 있는 둘**로 옮겼다: 띠는 `cohortTabs`, 시트는 `consoleSheet`.
//   판정 함수(`currentHref`)는 그대로다 — 걷힌 것은 **항목을 짓던 쪽**이지 판정이 아니다.
import { describe, expect, it } from 'vitest';
import { cohortIdOf, cohortTabs, currentHref, TAB_GROUP } from './consoleNav';
import { consoleSheet } from './consoleSheet';
import { readFileSync } from 'node:fs';

const COHORT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const groups = (cohortId: string | null) => (cohortId ? [{ title: TAB_GROUP, items: cohortTabs(cohortId) }] : []);
/** 띠가 실제로 하는 계산 그대로다(`ConsoleBand.tsx`) — 잣대가 실물과 같은 층에 선다. */
const current = (pathname: string) => currentHref(groups(cohortIdOf(pathname)), pathname);
const sheetHrefs = (role: 'coach' | 'admin') => consoleSheet(role).flatMap((g) => g.items.map((i) => i.href));

describe('콘솔 내비', () => {
  it('**참여자에게는 콘솔 껍데기가 서지 않는다** — 콘솔 전용이다', () => {
    // 항목을 감추는 것이 아니라 껍데기 자체가 안 선다(`ConsoleShell.tsx` — `role === 'user'` 조기 반환).
    const shell = readFileSync('src/app/_screens/console/ConsoleShell.tsx', 'utf8');
    expect(shell).toContain("role === 'user'");
  });

  it('운영자만 운영 문을 본다', () => {
    expect(sheetHrefs('coach')).not.toContain('/admin');
    expect(sheetHrefs('coach')).not.toContain('/admin/approvals');
    expect(sheetHrefs('admin')).toContain('/admin');
    expect(sheetHrefs('admin')).toContain('/admin/approvals');
  });

  it('**운영자에게도 인도자 묶음을 준다** — 역할로 화면을 가르지 않는다(ADR-51)', () => {
    expect(sheetHrefs('admin')).toContain('/coach');
    expect(sheetHrefs('admin')).toContain('/coach/cohorts');
  });

  it('회기 안에서만 띠가 선다 — 밖에서 회기 항목을 보이면 어디로 가는지 모른다', () => {
    expect(groups(cohortIdOf('/coach'))).toHaveLength(0);
    const inside = cohortTabs(COHORT).map((i) => i.href);
    expect(inside).toContain(`/coach/cohort/${COHORT}`);
    expect(inside).toContain(`/coach/cohort/${COHORT}/checkin`);
    expect(inside, '2차 산출물인 동행도 회기 문맥에 있다').toContain(`/feed?cohort=${COHORT}`);
  });

  it('회기 id 를 경로에서만 읽는다 — 서버 데이터를 기다리지 않는다', () => {
    expect(cohortIdOf(`/coach/cohort/${COHORT}/matrix`)).toBe(COHORT);
    expect(cohortIdOf('/coach/cohorts')).toBeNull();
    expect(cohortIdOf('/coach/cohort/not-a-uuid')).toBeNull();
    expect(cohortIdOf('/admin')).toBeNull();
  });

  it('**회기 안 모든 경로에서 현재가 정확히 하나다**', () => {
    for (const p of [
      `/coach/cohort/${COHORT}`,
      `/coach/cohort/${COHORT}/checkin`,
      `/coach/cohort/${COHORT}/checkin/preview`,
      `/coach/cohort/${COHORT}/matrix`,
      `/coach/cohort/${COHORT}/values`,
      `/coach/cohort/${COHORT}/group`,
    ]) {
      expect(current(p), `${p} — 현재가 정확히 하나여야 한다`).not.toBeNull();
    }
  });

  it('**가장 긴 일치가 이긴다** — 하위 경로가 상위를 켜지 않는다', () => {
    expect(current(`/coach/cohort/${COHORT}/checkin`)).toBe(`/coach/cohort/${COHORT}/checkin`);
    expect(current(`/coach/cohort/${COHORT}`)).toBe(`/coach/cohort/${COHORT}`);
  });

  it('**탭에 없는 화면에서도 위치를 잃지 않는다** — 상위 문맥이 켜진다', () => {
    // 리포트 상세·조원 세로 보기는 탭 항목이 아니다. exact 로 갈랐다면 아무것도 안 켜져
    //   사용자가 자기 위치를 잃는다. 긴 일치라 '대시보드'가 남는다.
    //   **이름은 그 화면의 본문 첫 줄이 든다**(U-6 · `tests/consoleNames.test.ts`).
    expect(current(`/coach/cohort/${COHORT}/report/rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr`)).toBe(`/coach/cohort/${COHORT}`);
    expect(current(`/coach/cohort/${COHORT}/member/uuuuuuuu-uuuu-uuuu-uuuu-uuuuuuuuuuuu`)).toBe(`/coach/cohort/${COHORT}`);
    expect(current(`/coach/cohort/${COHORT}/checkin/preview`), '회차 갈무리 하위도 그 항목에 붙는다')
      .toBe(`/coach/cohort/${COHORT}/checkin`);
  });

  it('세그먼트 경계를 지킨다 — /coach 가 /coaching 을 켜지 않는다', () => {
    expect(current('/coaching')).toBeNull();
    expect(cohortIdOf('/coaching')).toBeNull();
  });
});
