// 인도자 회차 현황(ADR-80 · Phase 7) — 코치/운영자 전용. 다음 회차 오프닝 자료 + 이탈 조기 경보.
//   명단(상태·지각·연락요청) + 한 걸음(1회차 전원 비공개=인도자 전용) + 공유 동의 문장(이름 없이).
//   지각은 submitted_at > closes_at 파생(컬럼 없음). care 의미색은 연락요청·돌봄 표시에만.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerContext } from '@/core/supabase/server';
import { getCheckinSession } from '@/instruments/futurenow/checkin';
import { anonNoticeText, buildCheckinRead, readAnonSuggestion } from '@/instruments/futurenow/checkin/readModel';
import { ScheduleSeedClient } from './ScheduleSeedClient';
import { CoachPhotos } from './CoachPhotos';
import { RosterDetail, type RosterEntry } from './RosterDetail';
import { defaultSessionNo } from './defaultSession';

export const dynamic = 'force-dynamic';

export default async function CoachCheckinPage({
  params,
  searchParams,
}: {
  params: Promise<{ cohortId: string }>;
  searchParams: Promise<{ session?: string | string[]; open?: string | string[] }>;
}) {
  const { cohortId } = await params;
  const sp = await searchParams;
  const openUserId = (Array.isArray(sp.open) ? sp.open[0] : sp.open) ?? null;
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home');

  const [sessions, members, cohort] = await Promise.all([
    ctx.listCohortSessions(cohortId),
    // 참여자만(ADR-118) — 이 명단은 코칭 대상이지 참가자 목록이 아니다. 운영자가 섞이면
    //   그들이 제출하지 않아 '연속 미착수' 신호가 인도자 자신에게 켜진다. 명단이 11 → 9 로 줄어드는 것은 의도다.
    ctx.listCohortMembers(cohortId, true),
    ctx.getCohort(cohortId).catch(() => null),
  ]);
  const hasSchedule = sessions.length > 0;
  const reqSession = typeof sp.session === 'string' ? Number(sp.session) : NaN;
  const sessionNo = Number.isFinite(reqSession) ? reqSession : defaultSessionNo(sessions);
  const row = sessions.find((s) => s.sessionNo === sessionNo) ?? null;
  const checkins = hasSchedule ? await ctx.listCohortCheckins(cohortId, sessionNo) : [];
  const byUser = new Map(checkins.map((c) => [c.userId, c]));

  const nameOf = (id: string) => members.find((m) => m.userId === id)?.name ?? '이름 미입력';
  const closesMs = row ? new Date(row.closesAt).getTime() : null;

  // 등록된 멤버의 갈무리만(이동/삭제된 사람의 checkins 는 DB에 남아도 현황에서 제외 — ADR-84)
  const memberIds = new Set(members.map((m) => m.userId));
  const enrolled = checkins.filter((c) => memberIds.has(c.userId));

  // 편지 사진 — 회차당 1회 조회해 명단 펼침·문장 모아 보기가 함께 쓴다(추가 왕복 0).
  const photoPairs = await Promise.all(
    enrolled.map(async (c) => [c.userId, await ctx.listCheckinPhotos(cohortId, sessionNo, c.userId).catch(() => [])] as const),
  );
  const photosByUser = new Map(photoPairs);

  // 명단 — 행을 펼치면 그 사람의 갈무리 전 항목(ADR-86). 데이터는 이미 서버 메모리에 있어 추가 조회 0.
  const roster: RosterEntry[] = members.map((m) => {
    const ck = byUser.get(m.userId);
    const status = ck?.submittedAt ? '제출' : ck?.hasContent ? '작성 중' : '미작성';
    const late = ck?.submittedAt && closesMs != null && new Date(ck.submittedAt).getTime() > closesMs;
    return {
      userId: m.userId,
      name: m.name ?? '이름 미입력',
      status,
      late: !!late,
      contact: !!ck?.contactRequest,
      // ADR-91 B4: 복귀 안내(checkin_mark 'prompt')가 행을 만들 수 있으므로 '행 존재'로 판정하면
      //   배너만 본 '미작성' 참여자에게 빈 펼침 화살표가 생긴다. 실제 내용이 있을 때만 펼친다.
      hasRow: !!ck && (ck.hasContent || ck.submittedAt != null),
      // 순수 데이터만 경계를 넘긴다 — copy 객체(함수 포함)는 절대 prop 에 싣지 않는다(ADR-85 직렬화 사고).
      blocks: ck
        ? buildCheckinRead(
            sessionNo,
            ck.answers,
            { stepPrivate: ck.stepPrivate, suggestionAnon: ck.suggestionAnon, contactRequest: ck.contactRequest },
            'facilitator',
          )
        : [],
      photos: photosByUser.get(m.userId) ?? [],
    };
  });

  // 인도자에게 온 부탁(need) — 수신자가 문안에 인도자로 명시된 유일한 자유서술이라 실명으로 전달한다.
  //   지금까지 읽는 경로가 0이어서 참여자에게 한 약속이 이행되지 않고 있었다(ADR-86).
  const needKey = getCheckinSession(sessionNo)?.wrap.facilitatorBox.need.key ?? '';
  const needs = enrolled
    .map((c) => ({ name: nameOf(c.userId), text: typeof c.answers?.[needKey] === 'string' ? (c.answers[needKey] as string).trim() : '' }))
    .filter((n) => n.text !== '');

  // 이름 없이 온 말 — 참여자가 익명 토글을 켠 '바라는 점'만. 이름이 붙는 자리(명단 펼침)에는 절대 두지 않는다.
  //   정렬키는 행 uuid(gen_random_uuid) — 명단 순서·userId·작성 시각과 무관해 회차마다 순열이 달라진다(재식별 완화).
  const anonSuggestions = enrolled
    .map((c) => ({ id: c.id, text: readAnonSuggestion(sessionNo, c.answers, { suggestionAnon: c.suggestionAnon }) }))
    .filter((s) => s.text !== '')
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => s.text);
  const anonNotice = anonNoticeText(sessionNo);

  const steps = enrolled
    .filter((c) => typeof c.answers?.step_what === 'string' && (c.answers.step_what as string).trim() !== '')
    .filter((c) => !c.stepPrivate)
    .map((c) => ({ name: nameOf(c.userId), what: c.answers.step_what as string, when: (c.answers.step_when as string) ?? '' }));

  // 문장 모아 보기(C2 §4.4) — 실명 + 회차별 요약 열(§5-6) + 편지 사진(ADR-83). 나눔 전 인도자가 개별 대면 동의.
  //   열 정의는 세션 레지스트리 summaryFields 에서(1회차 갈망·존재가치·기억 / 2회차 영역·인생의 한 문장·장면). 회차 키 하드코딩 제거(ADR-85).
  //   ADR-86: 이 섹션은 '나눔 도구'로 성격을 유지한다 — 명단 펼침(목양 도구)과 합치지 않는다.
  const sstr = (c: (typeof checkins)[number], k: string) => (typeof c.answers?.[k] === 'string' ? (c.answers[k] as string) : '');
  const isAdmin = me.role === 'admin';
  const summaryFields = getCheckinSession(sessionNo)?.summaryFields ?? [];
  const perMember = enrolled.map((c) => ({
    name: nameOf(c.userId),
    cells: summaryFields.map((f) =>
      'from' in f
        ? { label: f.label, text: `${sstr(c, f.from)} → ${sstr(c, f.to)}`, has: !!(sstr(c, f.from) || sstr(c, f.to)) }
        : { label: f.label, text: sstr(c, f.key), has: !!sstr(c, f.key) },
    ),
    photos: photosByUser.get(c.userId) ?? [],
  }));
  const sentences = perMember.filter((s) => s.cells.some((c) => c.has) || s.photos.length > 0);

  const sectionTitle = { color: 'var(--color-primary)', fontSize: 16, margin: '0 0 var(--space-2)' } as const;
  const card = { padding: 'var(--space-4)', background: 'var(--color-surface-1)', border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius)' } as const;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* **헤더는 껍데기가 그린다**(U-3 · §12.3 규칙 1). 제목·뒤로는 `_lib/screenChrome` 표가 든다. */}

      {/* 격자(ADR-118) — 명단 × 회차를 한 화면에. 이탈 조기 발견·소그룹 편성·연락 대상 고르기. */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-3)' }}>
        <Link
          className="t-caption"
          href={`/coach/cohort/${cohortId}/matrix`}
          style={{ padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius)', border: 'var(--border-hair) solid var(--color-border)', color: 'var(--color-primary)', textDecoration: 'none' }}
        >
          격자로 보기
        </Link>
      </div>

      <ScheduleSeedClient cohortId={cohortId} code={cohort?.code ?? ''} sessions={sessions} />

      {!hasSchedule ? null : (
        <>
          {/* 회차 탭 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
            {sessions.map((s) => (
              <Link
                key={s.sessionNo}
                href={`/coach/cohort/${cohortId}/checkin?session=${s.sessionNo}${openUserId ? `&open=${openUserId}` : ''}`}
                className="t-caption"
                style={{
                  padding: '4px var(--space-3)', borderRadius: 'var(--radius)', textDecoration: 'none',
                  border: `var(--border-hair) solid ${s.sessionNo === sessionNo ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  color: s.sessionNo === sessionNo ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                }}
              >
                {s.sessionNo}회차
              </Link>
            ))}
          </div>

          {/* 인도자에게 온 부탁 — 돌봄 우선이라 명단 위. 0건이면 섹션째 미렌더. */}
          {needs.length > 0 ? (
            <section style={{ marginBottom: 'var(--space-6)' }}>
              <h2 className="t-h2" style={sectionTitle}>부탁</h2>
              <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {needs.map((n, i) => (
                  <div key={i} className="t-body" style={{ color: 'var(--color-text)' }}>{n.name} — {n.text}</div>
                ))}
              </div>
            </section>
          ) : null}

          {/* 명단 — 행을 펼치면 그 사람의 갈무리 전 항목(ADR-86). */}
          <section style={{ marginBottom: 'var(--space-6)' }}>
            <h2 className="t-h2" style={sectionTitle}>명단</h2>
            <div style={card}>
              <RosterDetail
                entries={roster}
                openUserId={openUserId}
                cohortId={cohortId}
                sessionNos={sessions.map((s) => s.sessionNo)}
                currentSession={sessionNo}
                tabsLabel="다른 회차"
              />
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

          {/* 이름 없이 온 말 — 익명 토글을 켠 '바라는 점'만. 명단과 최대한 떨어뜨려 이름과 붙지 않게 한다.
              캡션은 참여자가 읽고 켠 고지 원문 그대로(신규 문안 0). 0건이면 섹션째 미렌더. */}
          {anonSuggestions.length > 0 ? (
            <section style={{ marginTop: 'var(--space-6)' }}>
              <h2 className="t-h2" style={sectionTitle}>이름 없이 온 말</h2>
              <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>{anonNotice}</p>
              <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {anonSuggestions.map((t, i) => (
                  <div key={i} className="t-body" style={{ color: 'var(--color-text)' }}>· {t}</div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
