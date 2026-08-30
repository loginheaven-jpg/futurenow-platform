// 그룹 리포트(/coach/cohort/[id]/group, §B③ · Step 3.3) — 차수 집계(축 평균·분포). 코치 전용 리얼.
// B-3: 사전·사후 각각 그룹 평균을 산출. 사후 응답이 있으면 사전/사후 두 평균을 라벨링해 비교, 없으면 사전 단독(폴백).
// 게이트: 미인증→/login · 멤버→/home · getCohort 소유 게이트 — 비소유·미존재 → 404. 멤버 순화(participantMirror)와 분리(ADR-30).
// 데이터: listResponses(wave별) → latestPerUser(재진단 dedup, 각 wave 최신 1건) → futurenowScoring.score → GroupView. 계약·DB 변경 0.
import { notFound, redirect } from 'next/navigation';
import type { Answers } from '@/contracts';
import { createServerContext } from '@/core/supabase/server';
import { GroupView } from '@/instruments/futurenow/report/GroupView';
import { GroupDesign } from '@/instruments/futurenow/report/GroupDesign';
import type { GroupMember } from '@/instruments/futurenow/report/groupModel';
import { futurenowScoring } from '@/instruments/futurenow/scoring';
import { latestPerUser } from '@/app/_lib/latestPerUser';
import { TOOL } from '@/app/_vocab/tool';

export const dynamic = 'force-dynamic';

export default async function GroupReportPage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home'); // 코치/운영자 전용 — 멤버 차단(리얼 비노출)

  const cohort = await ctx.getCohort(cohortId).catch(() => null);
  if (!cohort) notFound(); // 미존재/RLS 차단(비소유·비멤버) → 404 (차수 상세와 동일 게이트)

  // 사전·사후 각각 user별 최신 1건(재진단 dedup) → 평균. 사후 있으면 비교(B-3).
  //
  // ★ **이름 조인은 여기서 한다**(ORDER v2 §0 보완 ⑴ — 경계 예외로 승인).
  //   `GroupView`·`GroupDesign` 은 **뷰모델을 주입받는 순수 컴포넌트**로 남는다 —
  //   컴포넌트가 스스로 조회하면 채점·집계가 화면에 붙는다.
  //   `listResponses` 는 `userId` 만 주므로 `listCohortMembers` 와 맞춰 이름을 얻는다.
  const rowsFor = async (wave: 'pre' | 'post') => {
    const rs = await ctx.listResponses<Answers, unknown>({ instrumentId: 'futurenow', cohortId, wave });
    return latestPerUser(rs);
  };
  const [preRows, postRows, members] = await Promise.all([
    rowsFor('pre'),
    rowsFor('post'),
    // 참여자만(운영자·인도자 제외) — 등록 인원과 미완료를 그 기준으로 센다.
    ctx.listCohortMembers(cohortId, true).catch(() => []),
  ]);
  const nameOf = new Map(members.map((m) => [m.userId, m.name]));
  const toMembers = (rows: typeof preRows): GroupMember[] =>
    rows
      .filter((r) => r.userId !== null)
      .map((r) => ({
        userId: r.userId as string,
        name: nameOf.get(r.userId as string) ?? null,
        responseId: r.id,
        scores: futurenowScoring.score(r.answers, { wave: r.wave }),
      }));

  const preMembers = toMembers(preRows);
  const preScores = preMembers.map((m) => m.scores);
  const postScores = toMembers(postRows).map((m) => m.scores);
  const hasComparison = postScores.length > 0;

  const empty = preScores.length === 0 && postScores.length === 0;

  return (
    // **PDF 대비**(ORDER v2 §1) — 인쇄에서 숨길 앱 크롬을 식별 가능한 컨테이너로 감싸 둔다.
    //   다음 회차에 `.no-print` 를 붙이면 되고, 지금은 구조만 마련한다.
    <div className="group-report-root" style={{ maxWidth: 900, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* **헤더는 껍데기가 그린다**(U-3 · §12.3 규칙 1). 제목·뒤로는 `_lib/screenChrome` 표가 든다. */}
      <div className="group-report-chrome">
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-2)' }}>
          {hasComparison ? `${TOOL.pre}·${TOOL.post} 비교 · 차수 평균` : `${TOOL.pre} · 차수 평균`}
        </p>
        {/* ★ **인도자 전용 주의**(발주 §3 공통). 이 화면 자체를 투사하지 않게 한다. */}
        <div
          style={{
            background: 'var(--color-surface-1)', border: 'var(--border-hair) dashed var(--color-border)',
            borderRadius: 'var(--radius)', padding: 'var(--space-3)', margin: '0 0 var(--space-5)',
          }}
        >
          <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            <strong style={{ color: 'var(--color-text)' }}>인도자 전용 화면입니다.</strong>{' '}
            함정 그루핑·돌봄 명단·실명·개인 점수가 포함되어 있습니다.
            1주차 오프닝에서 참여자와 함께 볼 때는 「함께 보는 자료」만 띄우고, 이 화면 자체를 투사하지 마세요.
          </p>
        </div>
      </div>

      {empty ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          아직 제출된 응답이 없어요. 참여자가 {TOOL.pre}를 마치면 그룹 평균이 나타나요.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* ── 블록 0~4 — **사전 기준으로만 그린다**(ORDER v2 §0 보완 ⑵ · 인수 9).
              편성과 첫 돌봄 연락은 **세미나 시작 시점의 행동**이라 사후에는 쓰임이 다르다.
              두 벌로 그리면 인도자가 「이제 와서 조를 다시 짜야 하나」로 혼란한다. */}
          <GroupDesign cohortId={cohortId} members={members} done={preMembers} />

          {/* ── 블록 5 · 함께 보는 자료 — 기존 GrowChain·GapRadar 를 여기로 옮겨 유지한다(경계 5).
              **사후 비교는 여기서만 산다.** */}
          <section
            style={{
              background: 'var(--color-surface-2)', border: 'var(--border-hair) solid var(--color-border)',
              borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
            }}
          >
            <h2 className="t-h2" style={{ fontSize: 15, margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span
                aria-hidden
                style={{
                  width: 22, height: 22, borderRadius: 7, background: 'var(--color-primary)',
                  color: 'var(--color-text-on-accent)', fontSize: 12, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 22px',
                }}
              >5</span>
              함께 보는 자료 · 평균 지형
            </h2>
            <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0 var(--space-4)' }}>
              1주차 오프닝에서 참여자와 함께 볼 수 있는 유일한 영역입니다. 개인을 특정하지 않고 그룹의 윤곽만 보여줍니다.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {preScores.length > 0 ? (
                <div>
                  {hasComparison ? (
                    <h3 className="t-h2" style={{ color: 'var(--color-text-secondary)', fontSize: 14, margin: '0 0 var(--space-3)' }}>{TOOL.pre} — 그룹 평균</h3>
                  ) : null}
                  <GroupView all={preScores} />
                </div>
              ) : null}
              {hasComparison ? (
                <div>
                  <h3 className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 14, margin: '0 0 var(--space-3)' }}>{TOOL.post} — 그룹 평균</h3>
                  <GroupView all={postScores} />
                </div>
              ) : null}
            </div>
            {hasComparison ? (
              <p className="t-caption" style={{ color: 'var(--color-text-muted)', margin: 'var(--space-4) 0 0' }}>
                위쪽 편성·돌봄 자료는 {TOOL.pre} 기준입니다. {TOOL.post}는 이 비교에서 봅니다.
              </p>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
