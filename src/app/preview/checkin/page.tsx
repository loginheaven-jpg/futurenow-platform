'use client';
// 회차 갈무리 카드 미리보기(개발·검토용 — 운영 라우트 아님). /preview 계열 규약을 따른다.
//   목적: 아직 열리지 않은 회차를 지휘부·인도자가 **실제 컴포넌트 그대로** 확인한다.
//   카드 라우트는 opens_at 게이트에 역할 우회가 없어(설계대로) admin 도 미공개 회차를 못 연다.
//   일정을 임시로 당기는 것은 참여자 노출 위험이 있어 쓰지 않는다 — 대신 여기서 본다.
//
// **서버 쓰기 0**: preview 플래그가 자동저장·제출·최초진입 표식을 전부 막는다.
//   미리보기가 checkins 행을 만들거나 계측을 오염시키면 안 된다(ADR-86 제1원칙).
//   회차가 늘어도 이 파일은 그대로다 — 레지스트리에 등록된 회차가 자동으로 목록에 나온다.
import { useState } from 'react';
import { getCheckinSession } from '@/instruments/futurenow/checkin';
import { CheckinCardClient } from '@/app/my/cohorts/[cohortId]/checkin/[session]/CheckinCardClient';

// 되비추기 표본 — 지난 회차를 쓴 참여자를 가정한다. 실제로는 그 사람의 지난 회차 답이 들어간다.
const SAMPLE_PRIOR: Record<string, unknown> = {
  identity_sentence: '나는 성장의 가치를 최우선으로 여기며, 사람을 세우는 삶을 살기를 갈망하는 사람이다',
  identity_statement: "나는 '상생'의 가치를 최우선으로 여기며, 사람과 사물의 존재가치가 최상으로 빛나도록 돕는 사람이다",
  future_area: '관계',
  future_line: '주말마다 아버지와 한 시간씩 걷고 있다',
  step_what: '아버지께 안부 문자 보내기',
  step_when: '수요일 저녁, 퇴근길에',
};

// 레지스트리에 등록된 회차만 나열한다(미등록 회차는 '준비 중'이라 미리볼 것이 없다).
const SESSIONS = [1, 2, 3, 4, 5, 6, 7].filter((n) => getCheckinSession(n) !== null);

export default function CheckinPreviewPage() {
  const [sessionNo, setSessionNo] = useState(SESSIONS[SESSIONS.length - 1] ?? 1);
  const [withPrior, setWithPrior] = useState(true);

  const label = { color: 'var(--color-text-secondary)' } as const;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <div
        style={{
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-5)',
          background: 'var(--color-surface-1)',
          border: 'var(--border-hair) solid var(--color-border)',
          borderRadius: 'var(--radius)',
        }}
      >
        <div className="t-body-lg" style={{ color: 'var(--color-primary)' }}>갈무리 카드 미리보기</div>
        <p className="t-caption" style={{ ...label, margin: 'var(--space-1) 0 var(--space-3)' }}>
          실제 카드 컴포넌트입니다. 아무것도 저장되지 않고, 제출해도 서버에 남지 않습니다.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          {SESSIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSessionNo(n)}
              className="t-caption"
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

        <label className="t-caption" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', cursor: 'pointer', ...label }}>
          <input type="checkbox" checked={withPrior} onChange={(e) => setWithPrior(e.target.checked)} />
          지난 회차를 쓴 참여자로 보기(되비추기 표시)
        </label>
      </div>

      {/* key 로 회차·되비추기 전환 시 카드 상태를 초기화한다 — 이전 회차의 입력이 남지 않게. */}
      <CheckinCardClient
        key={`${sessionNo}-${withPrior}`}
        cohortId="preview"
        sessionNo={sessionNo}
        userId="preview"
        initialAnswers={{}}
        initialFlags={{ suggestionAnon: false, contactRequest: false, deepOpened: false, stepPrivate: false }}
        alreadyOpened
        hasContent={false}
        closed={false}
        prior={withPrior ? SAMPLE_PRIOR : null}
        initialMode="edit"
        photos={[]}
        preview
      />
    </div>
  );
}
