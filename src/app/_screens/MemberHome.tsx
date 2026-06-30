// 멤버 홈 본문(프레젠테이션 — 부수효과 없음). 진입-3: 진행 중 진단(조건부 골드 틴트 카드) + 내 활동 리스트 + 코드 참여.
// 데이터 = listMyCohorts(my_cohorts RPC). pre_done=false = 진행 중 진단(가입했으나 사전 미완). 참여자 팔레트·의미색 0(§0.4).
import type { CSSProperties } from 'react';
import type { MyCohortSummary } from '@/contracts';

const cta: CSSProperties = { width: '100%', textDecoration: 'none' };
const rowBase: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  padding: 'var(--space-4)',
  background: 'var(--color-surface-1)',
  border: 'var(--border-hair) solid var(--color-border)',
  borderLeftWidth: 3,
  borderRadius: 'var(--radius)',
  textDecoration: 'none',
};

function ActivityRow({ href, title, subtitle, disabled }: { href?: string; title: string; subtitle: string; disabled?: boolean }) {
  const style: CSSProperties = { ...rowBase, borderLeftColor: disabled ? 'var(--color-border)' : 'var(--color-primary)' };
  const body = (
    <>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t-body" style={{ color: disabled ? 'var(--color-text-muted)' : 'var(--color-text)' }}>{title}</div>
        <div className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</div>
      </div>
      {!disabled ? <span aria-hidden style={{ color: 'var(--color-text-muted)', fontSize: 20 }}>›</span> : null}
    </>
  );
  return disabled || !href ? <div style={style}>{body}</div> : <a href={href} style={style}>{body}</a>;
}

export function MemberHome({ greetingName, cohorts }: { greetingName: string; cohorts: MyCohortSummary[] }) {
  // 진행 중 진단: pre_done=false 중 가장 최근 가입(joinedAt desc) 1건
  const inProgress = [...cohorts].filter((c) => !c.preDone).sort((a, b) => b.joinedAt.localeCompare(a.joinedAt))[0] ?? null;
  const total = cohorts.length;
  const done = cohorts.filter((c) => c.preDone);
  const reportHref = done.length === 1 ? `/my/cohorts/${done[0].cohortId}/report` : '/my/cohorts';

  return (
    <div>
      <p className="t-body-lg" style={{ color: 'var(--color-text)', margin: '0 0 var(--space-6)' }}>
        {greetingName}님, 반가워요.
      </p>

      {/* 진행 중 진단 — 조건부 최상단(골드 틴트 블록) */}
      {inProgress ? (
        <section style={{ background: 'var(--color-accent-soft)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
          <p className="t-caption" style={{ color: 'var(--color-primary)', fontWeight: 600, margin: '0 0 var(--space-1)' }}>진행 중인 진단</p>
          <p className="t-body" style={{ color: 'var(--color-text)', margin: '0 0 var(--space-4)' }}>
            {inProgress.name} · 사전 진단을 아직 마치지 않았어요.
          </p>
          <a className="ui-btn" href={`/join?cohort=${inProgress.cohortId}`} style={{ ...cta, background: 'var(--color-accent)', color: 'var(--color-text-on-gold)' }}>
            이어서 진단하기
          </a>
        </section>
      ) : null}

      {/* 내 활동 — 리스트 행(왼쪽 네이비 강조선·우측 chevron) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        <ActivityRow href="/my/cohorts" title="내 세미나" subtitle={`참여 중 ${total} · 완료 ${done.length}`} />
        {done.length > 0 ? (
          <ActivityRow href={reportHref} title="내 리포트" subtitle="내 마음의 거울 다시 보기" />
        ) : (
          <ActivityRow title="내 리포트" subtitle="진단을 마치면 거울이 생겨요" disabled />
        )}
      </div>

      {/* 새 세미나 참여(코드) — 주 버튼 아님(진행 중·내 활동이 우선) */}
      <a className="ui-btn ui-btn--ghost" href="/join" style={cta}>코드로 세미나 참여</a>
    </div>
  );
}
