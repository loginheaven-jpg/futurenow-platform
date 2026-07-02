import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MyCohorts } from './MyCohorts';
import type { MyCohortSummary } from '@/contracts';

const cohort = (over: Partial<MyCohortSummary> = {}): MyCohortSummary => ({
  cohortId: 'co1',
  name: '2026 봄 1기',
  coachName: '김코치',
  status: 'active',
  preDone: false,
  postDone: false,
  postOpened: false,
  joinedAt: '2026-06-01',
  ...over,
});

describe('MyCohorts (내 차수 목록)', () => {
  it('빈 상태: 안내 + [코드로 참여]→/join', () => {
    const html = renderToStaticMarkup(<MyCohorts cohorts={[]} />);
    expect(html).toContain('아직 참여한 세미나가 없어요');
    expect(html).toContain('href="/join"');
  });

  it('차수 카드: 이름·코치명·status·진행 배지', () => {
    const html = renderToStaticMarkup(<MyCohorts cohorts={[cohort({ status: 'active' })]} />);
    expect(html).toContain('2026 봄 1기');
    expect(html).toContain('김코치');
    expect(html).toContain('진행 중');
    expect(html).toContain('사전 진단');
    expect(html).toContain('사후 진단');
  });

  it('사전 미완(가입자) → [진단 시작하기]→/join?cohort=… (코드 재입력 없이 러너 재진입)', () => {
    const html = renderToStaticMarkup(<MyCohorts cohorts={[cohort({ cohortId: 'co1', preDone: false })]} />);
    expect(html).toContain('진단 시작하기');
    expect(html).toContain('href="/join?cohort=co1"');
  });

  it('사전 완료 → [내 리포트] → /my/cohorts/[id]/report 활성 링크', () => {
    const html = renderToStaticMarkup(<MyCohorts cohorts={[cohort({ cohortId: 'co1', preDone: true })]} />);
    expect(html).toContain('내 리포트');
    expect(html).toContain('href="/my/cohorts/co1/report"');
  });

  it('참여자 화면 — 의미색 토큰 0', () => {
    const html = renderToStaticMarkup(<MyCohorts cohorts={[cohort()]} />);
    expect(html).not.toMatch(/--care|--danger|--warning/);
  });
});
