'use client';
// 복귀 안내(ADR-91 B). 실측: 1회차 제출 8건 중 3건이 2·3면을 건너뛴 채 굳었는데,
//   '돌아올 이유'를 만들 장치가 미구현이라 prompt_count 가 전부 0이었다.
//
// 규율 둘:
//   · '나중에'에 어떤 비용도 붙이지 않는다 — 죄책감 문구·재확인·카운트다운 금지. 누르면 사라진다.
//   · 판정·경고색을 쓰지 않는다(참여자 화면). accent 는 진행 흔적이지 경고가 아니다.
//
// 노출 기록은 상한 2(RPC)이며, 이 컴포넌트는 shouldPrompt 일 때 마운트 1회만 기록한다.
import { useEffect, useRef, useState } from 'react';
import { markCheckinPromptedAction } from './checkinPrompt.actions';

export function CheckinPrompt({
  cohortId,
  sessionNo,
  hasContent,
  shouldPrompt,
}: {
  cohortId: string;
  sessionNo: number;
  hasContent: boolean;
  shouldPrompt: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  const marked = useRef(false);

  useEffect(() => {
    if (!shouldPrompt || marked.current) return;
    marked.current = true;
    void markCheckinPromptedAction(cohortId, sessionNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dismissed) return null;

  return (
    <div
      style={{
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
        background: 'var(--color-accent-soft, var(--color-surface-2))',
        border: `var(--border-hair) solid ${shouldPrompt ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius)',
      }}
    >
      <div className="t-body" style={{ color: 'var(--color-text)' }}>
        {hasContent
          ? '쓰시던 자리가 남아 있어요. 몇 칸만 더 채우면 끝납니다.'
          : `${sessionNo}회차 갈무리가 열렸습니다. 3분이면 됩니다.`}
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
        <a
          className="ui-btn ui-btn--primary"
          href={`/my/cohorts/${cohortId}/checkin/${sessionNo}?edit=1`}
          style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}
        >
          지금 적기
        </a>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="ui-btn ui-btn--ghost"
          style={{ flex: 1, cursor: 'pointer' }}
        >
          나중에
        </button>
      </div>
    </div>
  );
}
