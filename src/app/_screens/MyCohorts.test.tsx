import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MyCohorts } from './MyCohorts';
import type { MyCohortSummary } from '@/contracts';
import { TOOL } from '@/app/_vocab/tool';

const cohort = (over: Partial<MyCohortSummary> = {}): MyCohortSummary => ({
  cohortId: 'co1',
  name: '2026 봄 1기',
  coachName: '김코치',
  status: 'active',
  preDone: false,
  postDone: false,
  postOpened: false,
  openSessionNo: null,
  openSessionSubmitted: false,
  openSessionHasContent: false,
  joinedAt: '2026-06-01',
  ...over,
});

describe('MyCohorts (내 회기 목록)', () => {
  it('빈 상태: 안내 + [코드로 참여]→/join', () => {
    const html = renderToStaticMarkup(<MyCohorts cohorts={[]} />);
    expect(html).toContain('아직 참여한 세미나가 없어요');
    expect(html).toContain('href="/join"');
  });

  it('회기 카드: 이름·코치명·status·진행 배지', () => {
    const html = renderToStaticMarkup(<MyCohorts cohorts={[cohort({ status: 'active' })]} />);
    expect(html).toContain('2026 봄 1기');
    expect(html).toContain('김코치');
    expect(html).toContain('진행 중');
    expect(html).toContain(TOOL.pre);
    expect(html).toContain(TOOL.post);
  });

  it('사전 미완(가입자) → [사전 체크 시작하기]→/join?cohort=… (코드 재입력 없이 러너 재진입)', () => {
    const html = renderToStaticMarkup(<MyCohorts cohorts={[cohort({ cohortId: 'co1', preDone: false })]} />);
    expect(html).toContain(`${TOOL.pre} 시작하기`);
    expect(html).toContain('href="/join?cohort=co1"');
  });

  it('사전 완료·열린 회차 없음 → [회기 열기] → 회기 홈(ADR-80 Phase 3)', () => {
    const html = renderToStaticMarkup(<MyCohorts cohorts={[cohort({ cohortId: 'co1', preDone: true })]} />);
    expect(html).toContain('회기 열기');
    expect(html).toContain('href="/my/cohorts/co1"');
  });

  // ADR-86: 이 버튼은 미제출일 때만 나오므로 작성 의도가 확정 → ?edit=1 로 편집 폼 직행(열람 화면 경유 금지).
  it('열린 회차 미제출 → [이번 주 갈무리] → /my/cohorts/[id]/checkin/[n]?edit=1 (2순위, ADR-80·86)', () => {
    const html = renderToStaticMarkup(<MyCohorts cohorts={[cohort({ cohortId: 'co1', preDone: true, openSessionNo: 3, openSessionSubmitted: false })]} />);
    expect(html).toContain('이번 주 갈무리');
    expect(html).toContain('href="/my/cohorts/co1/checkin/3?edit=1"');
  });

  it('사후 개시·미완(사전 완료) → [마무리 체크 하기]→/join?cohort=…&wave=post (B-2)', () => {
    const html = renderToStaticMarkup(<MyCohorts cohorts={[cohort({ cohortId: 'co1', preDone: true, postOpened: true, postDone: false })]} />);
    expect(html).toContain(`${TOOL.post} 하기`);
    expect(html).toContain('wave=post'); // href 는 &amp; escape — wave=post 존재로 확인
    expect(html).not.toContain('내 리포트'); // 사후 미완이면 리포트 대신 마무리 체크 CTA
  });

  it('참여자 화면 — 의미색 토큰 0', () => {
    const html = renderToStaticMarkup(<MyCohorts cohorts={[cohort()]} />);
    expect(html).not.toMatch(/--care|--danger|--warning/);
  });
});
