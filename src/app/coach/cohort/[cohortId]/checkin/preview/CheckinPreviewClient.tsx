'use client';
// 회차 갈무리 카드 미리보기(인도자 콘솔·ADR-92). 아직 열리지 않은 회차를 준비하면서 확인하는 자리.
//   카드 라우트는 opens_at 게이트에 역할 우회가 없어(설계대로) 운영자도 미공개 회차를 열 수 없고,
//   일정을 임시로 당기는 것은 되돌리기 전에 참여자가 열 위험이 있어 쓰지 않는다.
//
// **복제본이 아니라 실제 CheckinCardClient 를 그대로 렌더한다** — 회람용 HTML 처럼 따로 그리면 드리프트가 생긴다.
// **서버 쓰기 0**: preview 플래그가 자동저장·제출·최초진입 표식·사진 위젯을 전부 막는다(ADR-86 제1원칙).
// 회차 목록은 레지스트리에서 뽑으므로 4~7회차가 등록되면 이 파일은 그대로 따라온다.
import { useState } from 'react';
import { getCheckinSession } from '@/instruments/futurenow/checkin';
import { CheckinCardClient } from '@/app/(member)/my/cohorts/[cohortId]/checkin/[session]/CheckinCardClient';

// 되비추기 표본 — 지난 회차를 쓴 참여자를 가정한다. 실제로는 그 사람의 지난 회차 답이 들어간다.
//   ADR-103 이후 봉투가 깊이별이라 표본도 깊이별이다. 1 = 직전 회차, 2 = 두 회차 전.
//   **회차 문안이 되비추는 키를 하나도 빠뜨리지 않는다.** 앵커 키가 없으면 되비추기 상자가 통째로 사라지고,
//   뒤따르는 키가 없으면 값이 조용히 짧아진다 — 인도자가 그것을 결함으로 오해한다.
//   5회차가 4회차 step_blocker·domino_what 을 읽는데 표본에 없어 실제로 그 일이 났다(ADR-109).
//   실측으로도 표본이 실제보다 빈약했다 — 4회차 10행 중 step_blocker 7행 · domino_what 8행(후자는 4회차 필수).
export const SAMPLE_BACK1: Record<string, unknown> = {
  step_blocker: '야근이 늦게 끝나는 수요일',
  domino_what: '아버지와 매주 한 번 통화하기',
  identity_sentence: '나는 성장의 가치를 최우선으로 여기며, 사람을 세우는 삶을 살기를 갈망하는 사람이다',
  identity_statement: "나는 '상생'의 가치를 최우선으로 여기며, 사람과 사물의 존재가치가 최상으로 빛나도록 돕는 사람이다",
  future_area: '관계',
  future_line: '주말마다 아버지와 한 시간씩 걷고 있다',
  gap_area: '관계',
  gap_want: '아버지와 다시 대화하기',
  rough_project: '하루 한 줄 쓰기 한 달',
  step_what: '아버지께 안부 문자 보내기',
  step_when: '수요일 저녁, 퇴근길에',
};
// 두 회차 전 봉투 — 4회차 심화가 2회차 '인생을 이끌어갈 하나의 문장'을 읽는다(back: 2).
//   **back1 과 같은 값을 넣지 않는다** — 봉투가 분리돼 있음을 미리보기에서도 눈으로 확인할 수 있어야 한다.
export const SAMPLE_BACK2: Record<string, unknown> = {
  identity_statement: '나는 사람의 가능성이 가장 늦게 피는 자리에서 그것을 알아보는 사람이다',
};

const READY = [1, 2, 3, 4, 5, 6, 7].filter((n) => getCheckinSession(n) !== null);

export function CheckinPreviewClient({ cohortId, initialSession }: { cohortId: string; initialSession: number }) {
  const [sessionNo, setSessionNo] = useState(READY.includes(initialSession) ? initialSession : (READY[READY.length - 1] ?? 1));
  const [withPrior, setWithPrior] = useState(true);

  if (READY.length === 0) {
    return <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>아직 문안이 등록된 회차가 없습니다.</p>;
  }

  return (
    <div>
      <div
        style={{
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-5)',
          background: 'var(--color-surface-1)',
          border: 'var(--border-hair) solid var(--color-border)',
          borderRadius: 'var(--radius)',
        }}
      >
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
          참여자가 보는 카드 그대로입니다. 여기서 적은 것은 저장되지 않습니다.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          {READY.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSessionNo(n)}
              style={{
                minHeight: 'var(--tap-min)',
                padding: '0 var(--space-4)',
                borderRadius: 'var(--radius-pill)',
                cursor: 'pointer',
                font: 'inherit',
                fontSize: 13,
                border: `var(--border-hair) solid ${n === sessionNo ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: n === sessionNo ? 'var(--color-accent)' : 'var(--color-surface-2)',
                color: n === sessionNo ? 'var(--color-text-on-gold)' : 'var(--color-text-secondary)',
              }}
            >
              {n}회차
            </button>
          ))}
        </div>

        <label className="t-caption" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
          <input type="checkbox" checked={withPrior} onChange={(e) => setWithPrior(e.target.checked)} />
          지난 회차를 쓴 참여자로 보기(되비추기 표시)
        </label>
      </div>

      {/* key 로 회차·되비추기 전환 시 카드 상태를 초기화한다 — 이전 회차의 입력이 남지 않게. */}
      <CheckinCardClient
        key={`${sessionNo}-${withPrior}`}
        cohortId={cohortId}
        sessionNo={sessionNo}
        userId="preview"
        initialAnswers={{}}
        initialFlags={{ suggestionAnon: false, contactRequest: false, deepOpened: false, stepPrivate: false }}
        alreadyOpened
        hasContent={false}
        closed={false}
        priors={withPrior ? { 1: SAMPLE_BACK1, 2: SAMPLE_BACK2 } : {}}
        initialMode="edit"
        photos={[]}
        preview
      />
    </div>
  );
}
