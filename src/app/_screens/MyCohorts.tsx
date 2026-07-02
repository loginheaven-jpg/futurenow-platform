// 내 차수 목록 본문(프레젠테이션 — 부수효과 없음). 멤버 시점: 내가 속한 차수 + 진행 상태.
// 참여자 팔레트·중립. danger/warning/care 의미색 0(§0.4). 완료 배지만 accent(골드=진행 흔적).
// [내 리포트]는 Step 1.3 자리 — 라우트 미생성. 죽은 링크 금지 → 비활성(준비 중).
import type { CSSProperties } from 'react';
import type { MyCohortSummary } from '@/contracts';

const full: CSSProperties = { width: '100%', textDecoration: 'none' };

function ProgressBadge({ label, done, pendingText }: { label: string; done: boolean; pendingText: string }) {
  return (
    <span
      className="t-caption"
      style={{
        padding: '2px var(--space-2)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-border)',
        color: done ? 'var(--color-text-on-gold)' : 'var(--color-text-secondary)',
        background: done ? 'var(--color-accent)' : 'transparent',
        whiteSpace: 'nowrap',
      }}
    >
      {label} {done ? '완료' : pendingText}
    </span>
  );
}

export function MyCohorts({ cohorts }: { cohorts: MyCohortSummary[] }) {
  if (cohorts.length === 0) {
    return (
      <div>
        <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>
          아직 참여한 세미나가 없어요. 인도자에게 받은 코드로 참여해 보세요.
        </p>
        <a className="ui-btn ui-btn--primary" href="/join" style={full}>코드로 참여</a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {cohorts.map((c) => (
        <div
          key={c.cohortId}
          style={{ padding: 'var(--space-4)', background: 'var(--color-surface-1)', border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius)' }}
        >
          <div className="t-body-lg" style={{ color: 'var(--color-primary)' }}>{c.name}</div>
          <div className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
            {c.coachName ?? '인도자'} · {c.status === 'archived' ? '마감' : '진행 중'}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <ProgressBadge label="사전 진단" done={c.preDone} pendingText="미완" />
            <ProgressBadge label="사후 진단" done={c.postDone} pendingText="대기" />
          </div>

          {/* 다음 행동: 사전 미완 → 진단 직행 · 사후 개시·미완 → 사후 진단하기(B-2) · 그 외 → 내 리포트(순화 뷰) */}
          {!c.preDone ? (
            <a className="ui-btn ui-btn--primary" href={`/join?cohort=${c.cohortId}`} style={full}>진단 시작하기</a>
          ) : c.postOpened && !c.postDone ? (
            <a className="ui-btn ui-btn--primary" href={`/join?cohort=${c.cohortId}&wave=post`} style={full}>사후 진단하기</a>
          ) : (
            <a className="ui-btn ui-btn--ghost" href={`/my/cohorts/${c.cohortId}/report`} style={full}>내 리포트</a>
          )}
        </div>
      ))}
    </div>
  );
}
