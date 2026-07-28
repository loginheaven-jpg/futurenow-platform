// 인도자 회차 현황(ADR-80 · Phase 7) — 코치/운영자 전용. 다음 회차 오프닝 자료 + 이탈 조기 경보.
//   명단(상태·지각·연락요청) + 한 걸음(1회차 전원 비공개=인도자 전용) + 공유 동의 문장(이름 없이).
//   지각은 submitted_at > closes_at 파생(컬럼 없음). care 의미색은 연락요청·돌봄 표시에만.
import { redirect } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { createServerContext } from '@/core/supabase/server';
import { getCheckinSession } from '@/instruments/futurenow/checkin';
import { ScheduleSeedClient } from './ScheduleSeedClient';
import { CoachPhotos } from './CoachPhotos';

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

  const [sessions, members, cohort] = await Promise.all([
    ctx.listCohortSessions(cohortId),
    ctx.listCohortMembers(cohortId),
    ctx.getCohort(cohortId).catch(() => null),
  ]);
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

  // 문장 모아 보기(C2 §4.4) — 실명 + 회차별 요약 열(§5-6) + 편지 사진(ADR-83). 나눔 전 인도자가 개별 대면 동의.
  //   열 정의는 세션 레지스트리 summaryFields 에서(1회차 갈망·존재가치·기억 / 2회차 영역·인생의 한 문장·장면). 회차 키 하드코딩 제거(ADR-85).
  const sstr = (c: (typeof checkins)[number], k: string) => (typeof c.answers?.[k] === 'string' ? (c.answers[k] as string) : '');
  const isAdmin = me.role === 'admin';
  const summaryFields = getCheckinSession(sessionNo)?.summaryFields ?? [];
  // 등록된 멤버의 갈무리만(이동/삭제된 사람의 checkins 는 DB에 남아도 현황에서 제외 — ADR-84)
  const memberIds = new Set(members.map((m) => m.userId));
  const perMember = await Promise.all(
    checkins.filter((c) => memberIds.has(c.userId)).map(async (c) => ({
      name: nameOf(c.userId),
      cells: summaryFields.map((f) =>
        'from' in f
          ? { label: f.label, text: `${sstr(c, f.from)} → ${sstr(c, f.to)}`, has: !!(sstr(c, f.from) || sstr(c, f.to)) }
          : { label: f.label, text: sstr(c, f.key), has: !!sstr(c, f.key) },
      ),
      photos: await ctx.listCheckinPhotos(cohortId, sessionNo, c.userId).catch(() => []),
    })),
  );
  const sentences = perMember.filter((s) => s.cells.some((c) => c.has) || s.photos.length > 0);

  const sectionTitle = { color: 'var(--color-primary)', fontSize: 16, margin: '0 0 var(--space-2)' } as const;
  const card = { padding: 'var(--space-4)', background: 'var(--color-surface-1)', border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius)' } as const;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="sub" title="회차 갈무리 현황" backHref={`/coach/cohort/${cohortId}`} homeHref="/home" action={<HeaderActions />} />

      <ScheduleSeedClient cohortId={cohortId} code={cohort?.code ?? ''} sessions={sessions} />

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

          {/* 문장 모아 보기(C2 §4.4) — 실명 + 세 문장. 나눔 전 개별 대면 동의를 구하는 실무 도구. */}
          <section>
            <h2 className="t-h2" style={sectionTitle}>문장 모아 보기</h2>
            <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
              다음 시간에 나눌 문장을 여기서 고르세요. 나누기 전에 본인에게 개별로 동의를 구합니다.
            </p>
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {sentences.length === 0 ? (
                <p className="t-caption" style={{ color: 'var(--color-text-muted)', margin: 0 }}>아직 없어요.</p>
              ) : (
                sentences.map((s, i) => (
                  <div key={i} style={{ borderBottom: i < sentences.length - 1 ? 'var(--border-hair) solid var(--color-border)' : 'none', paddingBottom: 'var(--space-2)' }}>
                    <div className="t-body" style={{ color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>{s.name}</div>
                    {s.cells.map((c, j) => (c.has ? (
                      <div key={j} className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{c.label} · {c.text}</div>
                    ) : null))}
                    <CoachPhotos photos={s.photos} canDelete={isAdmin} />
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
