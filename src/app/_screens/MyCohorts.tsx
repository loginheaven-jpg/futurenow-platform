// 내 회기 목록 본문(프레젠테이션 — 부수효과 없음). 멤버 시점: 내가 속한 회기 + 진행 상태.
// 참여자 팔레트·중립. danger/warning/care 의미색 0(§0.4). 완료 배지만 accent(골드=진행 흔적).
// 다음 행동: 사전 미완→[진단 시작하기] · 사후 개시·미완→[사후 진단하기](B-2) · 그 외→[내 리포트](순화 뷰, 라우트 구현 완료).
import { postJoinHref } from '@/app/_vocab/postNudge';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { MyCohortSummary } from '@/contracts';
import { TOOL } from '@/app/_vocab/tool';

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
        <Link className="ui-btn ui-btn--primary" href="/join" style={full}>코드로 참여</Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {cohorts.map((c) => (
        <div
          key={c.cohortId}
          style={{ position: 'relative', padding: 'var(--space-4)', background: 'var(--color-surface-1)', border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius)' }}
        >
          {/* 카드 전체 탭 → 회기 홈(진단 둘 + 갈무리 일곱을 담는 본체, ADR-80). 스트레치드 링크 — 버튼만 위로 올려 자기 액션 유지 */}
          <a
            href={`/my/cohorts/${c.cohortId}`}
            aria-label={`${c.name} 회기 홈 열기`}
            style={{ position: 'absolute', inset: 0, zIndex: 0, borderRadius: 'var(--radius)' }}
          />

          {/* 제목·배지(클릭은 카드 링크로 통과 — pointerEvents none) */}
          <div style={{ position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
            <div className="t-body-lg" style={{ color: 'var(--color-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-2)' }}>
              <span>{c.name}</span>
              <span aria-hidden style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>회기 홈 ›</span>
            </div>
            <div className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
              {c.coachName ?? '인도자'} · {c.status === 'archived' ? '마감' : '진행 중'}
            </div>
            {/* 배지는 진단 둘만(갈무리는 배지로 만들지 않는다 — 죄책감 장치·480px 줄바꿈 방지, ADR-80) */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <ProgressBadge label={TOOL.pre} done={c.preDone} pendingText="미완" />
              <ProgressBadge label={TOOL.post} done={c.postDone} pendingText="대기" />
            </div>
          </div>

          {/* 우선순위 버튼(카드 링크 위 — 자기 목적지). 사전 미완 → 진단 · 열린 회차 미제출 → 이번 주 갈무리 · 사후 개시·미완 → 사후 · 그 외 → 회기 열기 */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {!c.preDone ? (
              <Link className="ui-btn ui-btn--primary" href={`/join?cohort=${c.cohortId}`} style={full}>{TOOL.pre} 시작하기</Link>
            ) : c.openSessionNo !== null && !c.openSessionSubmitted ? (
              // 이 분기는 미제출일 때만 걸리므로 작성 의도가 확정이다 → 편집으로 직행(ADR-86)
              <Link className="ui-btn ui-btn--primary" href={`/my/cohorts/${c.cohortId}/checkin/${c.openSessionNo}?edit=1`} style={full}>이번 주 갈무리</Link>
            ) : c.postOpened && !c.postDone ? (
              <Link className="ui-btn ui-btn--primary" href={postJoinHref(c.cohortId)} style={full}>{TOOL.post} 하기</Link>
            ) : (
              <Link className="ui-btn ui-btn--ghost" href={`/my/cohorts/${c.cohortId}`} style={full}>회기 열기</Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
