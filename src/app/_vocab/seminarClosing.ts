// 세미나 마무리 구획과 마감 확인문(A15·A16). 화면은 분기된 문안을 그대로 표시한다.
import { TOOL } from './tool';

export const SEMINAR_CLOSING_COPY = {
  title: '세미나 마무리',
  openCaption: '세미나를 마친 뒤 열어 주세요',
  openAction: `${TOOL.post} 개시`,
  archiveAction: '회기 마감',
  archived: '이미 마감된 회기예요.',
  reopenAction: '다시 열기',
  cancel: '취소',
  confirm: '마감 확정',
  share: '안내 보내기',
  copied: '링크 복사됨 ✓',
  managementSummary: '이름 · 소개 · 정원',
  managementSummaryWithDelete: '이름 · 소개 · 정원 · 삭제',
  noticeHeading: '마감하면 이렇게 됩니다.',
  joining: '· 이 회기의 참여 코드로 새로 들어올 수 없습니다.',
  access: '· 포럼회원이 아니고 다른 진행 중 세미나 회기도 없는 참여자는 바깥 도구의 새 이용이 제한됩니다. 본인 기록 열람은 그대로입니다. 마감이 포럼회원 자격을 만들지는 않습니다.',
  recordsWhenOpened: '· 이 회기의 기록 열람, 그리고 이미 열린 마무리 체크와 회차 갈무리의 작성은 그대로입니다.',
  recordsWhenUnopened: '· 이 회기의 기록 열람과 열린 회차 갈무리의 작성은 그대로입니다.',
  unopened: '· 마무리 체크를 아직 열지 않았습니다.',
  restoring: '다시 열기를 누르면 진행 중 상태로 돌아갑니다. 참여 코드의 유효기간과 마무리 체크 개시 여부는 바뀌지 않습니다.',
} as const;

type PostStatus = { done: number; total: number; pending: readonly string[] };

export function seminarClosingModel({ postOpened, postStatus }: { postOpened: boolean; postStatus?: PostStatus }) {
  const pending = postStatus?.pending ?? [];
  const pendingNotice = pending.length > 0
    ? `· 마무리 체크 미작성 ${pending.length}명 - ${pending.join(' · ')}`
    : null;
  const noticeLines = [
    SEMINAR_CLOSING_COPY.noticeHeading,
    SEMINAR_CLOSING_COPY.joining,
    SEMINAR_CLOSING_COPY.access,
    postOpened ? SEMINAR_CLOSING_COPY.recordsWhenOpened : SEMINAR_CLOSING_COPY.recordsWhenUnopened,
    ...(postOpened ? pendingNotice ? [pendingNotice] : [] : [SEMINAR_CLOSING_COPY.unopened]),
    SEMINAR_CLOSING_COPY.restoring,
  ];
  return {
    archiveNotice: noticeLines.join('\n'),
    progress: postOpened && postStatus ? {
      label: TOOL.post,
      done: postStatus.done,
      total: postStatus.total,
      pendingLine: pending.length > 0 ? `미작성 — ${pending.join(' · ')}` : null,
      showNoticeButton: pending.length > 0,
    } : null,
  };
}
