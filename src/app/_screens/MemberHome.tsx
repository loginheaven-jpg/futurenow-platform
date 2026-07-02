// 통합 홈 본문(프레젠테이션 — 부수효과 없음). 진입-3: (코치·운영자)운영 진입 카드 + 진행 중 진단(골드 틴트) + 내 활동 + 코드 참여.
// 데이터 = listMyCohorts(my_cohorts RPC). pre_done=false = 진행 중 진단(가입했으나 사전 미완). 참여자 팔레트·의미색 0(§0.4).
// role: 코치·운영자에게만 '운영' 카드(→/coach·/admin) 노출(A′-1 역할 감금 해제 — 홈은 전원 개방·카드는 자격자만).
import type { CSSProperties } from 'react';
import type { MyCohortSummary, Role } from '@/contracts';

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

export function MemberHome({ greetingName, cohorts, role = 'user', pendingCoachApps = 0 }: { greetingName: string; cohorts: MyCohortSummary[]; role?: Role; pendingCoachApps?: number }) {
  const isStaff = role === 'coach' || role === 'admin'; // 콘솔 접근 자격(운영자는 코치 콘솔도 열람 가능)
  // 진행 중 진단: pre_done=false 중 가장 최근 가입(joinedAt desc) 1건
  const inProgress = [...cohorts].filter((c) => !c.preDone).sort((a, b) => b.joinedAt.localeCompare(a.joinedAt))[0] ?? null;
  // 사후 진단하기: 사후 개시·미완(post_opened && !post_done). 사전 미완이면 위 pre 카드가 우선(B-2).
  const postPending = [...cohorts].filter((c) => c.postOpened && !c.postDone).sort((a, b) => b.joinedAt.localeCompare(a.joinedAt))[0] ?? null;
  const total = cohorts.length;
  const done = cohorts.filter((c) => c.preDone);
  const reportHref = done.length === 1 ? `/my/cohorts/${done[0].cohortId}/report` : '/my/cohorts';

  return (
    <div>
      <p className="t-body-lg" style={{ color: 'var(--color-text)', margin: '0 0 var(--space-6)' }}>
        {greetingName}님, 반가워요.
      </p>

      {/* 운영 — 코치·운영자만(인사말 아래·활동 위). 중립 팔레트(참여자 미노출·§0.4). 콘솔/본부는 자격 게이트가 별도 방어. */}
      {isStaff ? (
        <section style={{ marginBottom: 'var(--space-6)' }}>
          <p className="t-caption" style={{ color: 'var(--color-text-secondary)', fontWeight: 600, margin: '0 0 var(--space-2)' }}>운영</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <ActivityRow href="/coach" title="인도자 콘솔" subtitle="내 차수·돌봄 관리" />
            {role === 'admin' ? <ActivityRow href="/admin" title="본부" subtitle={pendingCoachApps > 0 ? `승인 대기 ${pendingCoachApps}건 · 코치 신청·멤버 관리` : '코치 신청·멤버 관리'} /> : null}
          </div>
        </section>
      ) : null}

      {/* 진행 중 진단 — 조건부 최상단(골드 틴트 블록). 사전 미완 우선, 없으면 사후 개시·미완(B-2). */}
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
      ) : postPending ? (
        <section style={{ background: 'var(--color-accent-soft)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
          <p className="t-caption" style={{ color: 'var(--color-primary)', fontWeight: 600, margin: '0 0 var(--space-1)' }}>사후 진단이 열렸어요</p>
          <p className="t-body" style={{ color: 'var(--color-text)', margin: '0 0 var(--space-4)' }}>
            {postPending.name} · 세미나를 마친 지금의 나를 담아 주세요.
          </p>
          <a className="ui-btn" href={`/join?cohort=${postPending.cohortId}&wave=post`} style={{ ...cta, background: 'var(--color-accent)', color: 'var(--color-text-on-gold)' }}>
            사후 진단하기
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
