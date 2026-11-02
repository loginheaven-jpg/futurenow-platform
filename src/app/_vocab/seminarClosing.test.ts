import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SEMINAR_CLOSING_COPY, seminarClosingModel } from './seminarClosing';

const openedNotice = `마감하면 이렇게 됩니다.
· 이 회기의 참여 코드로 새로 들어올 수 없습니다.
· 포럼회원이 아니고 다른 진행 중 세미나 회기도 없는 참여자는 바깥 도구의 새 이용이 제한됩니다. 본인 기록 열람은 그대로입니다. 마감이 포럼회원 자격을 만들지는 않습니다.
· 이 회기의 기록 열람, 그리고 이미 열린 마무리 체크와 회차 갈무리의 작성은 그대로입니다.
· 마무리 체크 미작성 2명 - 김참여 · 이참여
다시 열기를 누르면 진행 중 상태로 돌아갑니다. 참여 코드의 유효기간과 마무리 체크 개시 여부는 바뀌지 않습니다.`;
const unopenedNotice = `마감하면 이렇게 됩니다.
· 이 회기의 참여 코드로 새로 들어올 수 없습니다.
· 포럼회원이 아니고 다른 진행 중 세미나 회기도 없는 참여자는 바깥 도구의 새 이용이 제한됩니다. 본인 기록 열람은 그대로입니다. 마감이 포럼회원 자격을 만들지는 않습니다.
· 이 회기의 기록 열람과 열린 회차 갈무리의 작성은 그대로입니다.
· 마무리 체크를 아직 열지 않았습니다.
다시 열기를 누르면 진행 중 상태로 돌아갑니다. 참여 코드의 유효기간과 마무리 체크 개시 여부는 바뀌지 않습니다.`;

describe('세미나 마무리 A15·A16 — 문안과 분기', () => {
  it('개시 후 확인문 전체를 유지하고 미작성 m은 total이 아니라 명단에서 센다', () => {
    const model = seminarClosingModel({ postOpened: true, postStatus: { done: 7, total: 9, pending: ['김참여', '이참여'] } });
    expect(model.archiveNotice).toBe(openedNotice);
    expect(model.archiveNotice).not.toContain('미작성 9명');
    expect(model.progress).toEqual({ label: '마무리 체크', done: 7, total: 9, pendingLine: '미작성 — 김참여 · 이참여', showNoticeButton: true });
  });

  it('개시 후 미작성 0명이면 해당 줄 전체를 생략하고 안내 버튼도 생략한다', () => {
    const model = seminarClosingModel({ postOpened: true, postStatus: { done: 9, total: 9, pending: [] } });
    expect(model.archiveNotice).toBe(openedNotice.replace('· 마무리 체크 미작성 2명 - 김참여 · 이참여\n', ''));
    expect(model.progress?.pendingLine).toBeNull();
    expect(model.progress?.showNoticeButton).toBe(false);
  });

  it.each([
    { done: 0, total: 3, pending: ['가', '나', '다'] },
    { done: 1, total: 3, pending: ['나', '다'] },
    { done: 3, total: 3, pending: [] },
  ])('미개시라면 진행값 $done/$total과 무관하게 미개시용 두 줄을 쓴다', (postStatus) => {
    const model = seminarClosingModel({ postOpened: false, postStatus });
    expect(model.archiveNotice).toBe(unopenedNotice);
    expect(model.progress).toBeNull();
  });

  it.each([true, false])('postStatus 없는 fixture도 가짜 진행 수치를 만들지 않는다: opened=%s', (postOpened) => {
    const model = seminarClosingModel({ postOpened });
    expect(model.progress).toBeNull();
    expect(model.archiveNotice).toBe(postOpened
      ? openedNotice.replace('· 마무리 체크 미작성 2명 - 김참여 · 이참여\n', '')
      : unopenedNotice);
  });

  it('제목·확정 버튼·관리 요약은 승인 문안이다', () => {
    expect(SEMINAR_CLOSING_COPY.title).toBe('세미나 마무리');
    expect(SEMINAR_CLOSING_COPY.cancel).toBe('취소');
    expect(SEMINAR_CLOSING_COPY.confirm).toBe('마감 확정');
    expect(SEMINAR_CLOSING_COPY.managementSummary).toBe('이름 · 소개 · 정원');
    expect(SEMINAR_CLOSING_COPY.managementSummaryWithDelete).toBe('이름 · 소개 · 정원 · 삭제');
  });

  it('화면은 확인문을 별도로 쓰지 않고 순수 모델의 결과를 표시한다', () => {
    const src = readFileSync('src/app/_screens/console/CohortDetail.tsx', 'utf8');
    expect(src).toContain('seminarClosingModel({ postOpened, postStatus })');
    expect(src).toContain('{closing.archiveNotice}');
    expect(src).not.toContain(SEMINAR_CLOSING_COPY.access);
    expect(src).not.toContain(SEMINAR_CLOSING_COPY.recordsWhenOpened);
  });
});
