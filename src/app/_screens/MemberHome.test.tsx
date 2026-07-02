import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemberHome } from './MemberHome';
import type { MyCohortSummary } from '@/contracts';

const cohort = (over: Partial<MyCohortSummary> = {}): MyCohortSummary => ({
  cohortId: 'co1',
  name: '봄 1기',
  coachName: '김코치',
  status: 'active',
  preDone: false,
  postDone: false,
  postOpened: false,
  joinedAt: '2026-06-01',
  ...over,
});

describe('MemberHome (멤버 홈 본문 — 진입-3)', () => {
  it('진행 중 진단(pre_done=false) → 골드 카드 + [이어서 진단하기]→/join?cohort=', () => {
    const html = renderToStaticMarkup(<MemberHome greetingName="이멤버" cohorts={[cohort({ cohortId: 'co1', preDone: false })]} />);
    expect(html).toContain('이멤버님');
    expect(html).toContain('진행 중인 진단');
    expect(html).toContain('이어서 진단하기');
    expect(html).toContain('href="/join?cohort=co1"');
    expect(html).toContain('--color-text-on-gold'); // 골드 버튼 네이비 글자
  });

  it('진행 중 없으면(전부 완료) 카드 생략 + 내 리포트 활성(완료 1건 직접)', () => {
    const html = renderToStaticMarkup(<MemberHome greetingName="이멤버" cohorts={[cohort({ cohortId: 'c2', preDone: true })]} />);
    expect(html).not.toContain('진행 중인 진단');
    expect(html).toContain('내 리포트');
    expect(html).toContain('href="/my/cohorts/c2/report"');
  });

  it('내 세미나 행(참여 중 N · 완료 M) → /my/cohorts, 코드 참여 → /join', () => {
    const html = renderToStaticMarkup(
      <MemberHome greetingName="이멤버" cohorts={[cohort({ preDone: true }), cohort({ cohortId: 'co3', preDone: false })]} />,
    );
    expect(html).toContain('내 세미나');
    expect(html).toContain('참여 중 2 · 완료 1');
    expect(html).toContain('href="/my/cohorts"');
    expect(html).toContain('코드로 세미나 참여');
    expect(html).toContain('href="/join"');
  });

  it('빈 상태(차수 0) — 카드 생략·참여 0/완료 0·내 리포트 비활성 안내', () => {
    const html = renderToStaticMarkup(<MemberHome greetingName="이멤버" cohorts={[]} />);
    expect(html).not.toContain('진행 중인 진단');
    expect(html).toContain('참여 중 0 · 완료 0');
    expect(html).toContain('진단을 마치면 거울이 생겨요');
  });

  it('참여자 화면 — 의미색 토큰 0', () => {
    const html = renderToStaticMarkup(<MemberHome greetingName="이멤버" cohorts={[cohort()]} />);
    expect(html).not.toMatch(/--care|--danger|--warning/);
  });

  it('참여자(기본) — 운영 카드 미노출(A′-1 자격자만)', () => {
    const html = renderToStaticMarkup(<MemberHome greetingName="이멤버" cohorts={[]} />);
    expect(html).not.toContain('인도자 콘솔');
    expect(html).not.toContain('본부');
  });

  it('코치 — 인도자 콘솔 카드(→/coach), 본부 미노출', () => {
    const html = renderToStaticMarkup(<MemberHome greetingName="김코치" cohorts={[]} role="coach" />);
    expect(html).toContain('인도자 콘솔');
    expect(html).toContain('href="/coach"');
    expect(html).not.toContain('본부');
  });

  it('운영자 — 인도자 콘솔 + 본부 카드(→/admin)', () => {
    const html = renderToStaticMarkup(<MemberHome greetingName="관리자" cohorts={[]} role="admin" />);
    expect(html).toContain('인도자 콘솔');
    expect(html).toContain('본부');
    expect(html).toContain('href="/admin"');
  });
});
