// 인도자 회차 현황(ADR-80 · Phase 7) — 코치/운영자 전용. 다음 회차 오프닝 자료 + 이탈 조기 경보.
//   명단(상태·지각·연락요청) + 한 걸음(1회차 전원 비공개=인도자 전용) + 공유 동의 문장(이름 없이).
//   지각은 submitted_at > closes_at 파생(컬럼 없음). care 의미색은 연락요청·돌봄 표시에만.
import { redirect } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { createServerContext } from '@/core/supabase/server';
import { ScheduleSeedClient } from './ScheduleSeedClient';

export const dynamic = 'force-dynamic';

export default async function CoachCheckinPage({
  params,
  searchParams,
}: {
  params: Promise<{ cohortId: string }>;
  searchParams: Promise<{ session?: string | string[] }>;
}) {
  const { cohortId } = await params;
  const sp = await searchParams;
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home');

  const [sessions, members] = await Promise.all([ctx.listCohortSessions(cohortId), ctx.listCohortMembers(cohortId)]);
  const hasSchedule = sessions.length > 0;
  const reqSession = typeof sp.session === 'string' ? Number(sp.session) : NaN;
  const sessionNo = Number.isFinite(reqSession) ? reqSession : (sessions[0]?.sessionNo ?? 1);
  const row = sessions.find((s) => s.sessionNo === sessionNo) ?? null;
  const checkins = hasSchedule ? await ctx.listCohortCheckins(cohortId, sessionNo) : [];
  const byUser = new Map(checkins.map((c) => [c.userId, c]));

  const nameOf = (id: string) => members.find((m) => m.userId === id)?.name ?? '이름 미입력';
  const closesMs = row ? new Date(row.closesAt).getTime() : null;

  const roster = members.map((m) => {
    const ck = byUser.get(m.userId);
    const status = ck?.submittedAt ? '제출' : ck?.hasContent ? '작성 중' : '미작성';
    const late = ck?.submittedAt && closesMs != null && new Date(ck.submittedAt).getTime() > closesMs;
    return { name: m.name ?? '이름 미입력', status, late: !!late, contact: !!ck?.contactRequest };
  });

  const steps = checkins
    .filter((c) => typeof c.answers?.step_what === 'string' && (c.answers.step_what as string).trim() !== '')
    .filter((c) => !c.stepPrivate)
    .map((c) => ({ name: nameOf(c.userId), what: c.answers.step_what as string, when: (c.answers.step_when as string) ?? '' }));

  const shares = checkins
    .filter((c) => c.shareConsent && typeof c.answers?.share_target === 'string' && (c.answers.share_target as string).trim() !== '')
    .map((c) => c.answers.share_target as string);

  const sectionTitle = { color: 'var(--color-primary)', fontSize: 16, margin: '0 0 var(--space-2)' } as const;
  const card = { padding: 'var(--space-4)', background: 'var(--color-surface-1)', border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius)' } as const;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="sub" title="회차 갈무리 현황" backHref={`/coach/cohort/${cohortId}`} homeHref="/home" action={<HeaderActions />} />

      <ScheduleSeedClient cohortId={cohortId} sessions={sessions} />

      {!hasSchedule ? null : (
        <>
          {/* 회차 탭 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
            {sessions.map((s) => (
              <a
                key={s.sessionNo}
                href={`/coach/cohort/${cohortId}/checkin?session=${s.sessionNo}`}
                className="t-caption"
                style={{
                  padding: '4px var(--space-3)', borderRadius: 'var(--radius)', textDecoration: 'none',
                  border: `var(--border-hair) solid ${s.sessionNo === sessionNo ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  color: s.sessionNo === sessionNo ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                }}
              >
                {s.sessionNo}회차
              </a>
            ))}
          </div>

          {/* 명단 */}
          <section style={{ marginBottom: 'var(--space-6)' }}>
            <h2 className="t-h2" style={sectionTitle}>명단</h2>
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {roster.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span className="t-body" style={{ flex: 1, color: 'var(--color-text)' }}>{r.name}</span>
                  <span className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{r.status}</span>
                  {r.late ? <span className="t-caption" style={{ color: 'var(--color-care, var(--color-text-muted))' }}>지각</span> : null}
                  {r.contact ? <span className="t-caption" style={{ color: 'var(--color-care, var(--color-primary))' }}>연락 요청</span> : null}
                </div>
              ))}
            </div>
          </section>

          {/* 한 걸음(1회차 전원 비공개 = 인도자 전용) */}
          <section style={{ marginBottom: 'var(--space-6)' }}>
            <h2 className="t-h2" style={sectionTitle}>한 걸음 {sessionNo === 1 ? <span className="t-caption" style={{ color: 'var(--color-text-muted)' }}>· 인도자 전용</span> : null}</h2>
            <div style={card}>
              {steps.length === 0 ? (
                <p className="t-caption" style={{ color: 'var(--color-text-muted)', margin: 0 }}>아직 없어요.</p>
              ) : (
                steps.map((s, i) => (
                  <div key={i} style={{ marginBottom: 'var(--space-2)' }}>
                    <span className="t-body" style={{ color: 'var(--color-text)' }}>{s.name} — {s.what}</span>
                    {s.when ? <span className="t-caption" style={{ color: 'var(--color-text-secondary)' }}> · {s.when}</span> : null}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* 공유 동의 문장(이름 없이) */}
          {shares.length > 0 ? (
            <section>
              <h2 className="t-h2" style={sectionTitle}>나눔 문장 <span className="t-caption" style={{ color: 'var(--color-text-muted)' }}>· 이름 없이</span></h2>
              <div style={card}>
                {shares.map((s, i) => (
                  <div key={i} className="t-body" style={{ color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>· {s}</div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
