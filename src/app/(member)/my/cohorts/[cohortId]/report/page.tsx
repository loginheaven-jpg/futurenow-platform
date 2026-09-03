// 멤버 내 리포트(/my/cohorts/[cohortId]/report) — **인도자 리포트의 약식판**(ADR-188).
//
// ★★ **ADR-27 하드룰을 지휘부가 개정했다**(2026-09-03 승인).
//   옛 규율은 *「참여자엔 측정·severity·돌봄 0건」* 이었고 그래서 이 화면은 문장(갈망 거울)뿐이었다.
//   지휘부 지시: *「참여자 리포트를 인도자 리포트 약식 버전으로. 상단 표제부는 인도자용과 동일.
//   그 아래 4개 차트는 나침반과 다섯 영역의 간격 두 가지만. '나에게 묻는 시간' 박스 그대로.
//   그 아래 현재 참여자 리포트에 쓰는 내용.」*
//
//   ★ **금지의 표적은 그대로 지킨다.** 옛 규율이 막으려던 것은 «남이 나를 재서 등급을 매긴다» 였고
//   그것은 **활력 구간(「시들음」)·돌봄 신호·함정 유형**에 있다. 그 셋은 여기 오지 않는다:
//     · `CareSignal`      — 의미색 + severity (불변식 9)
//     · `VitalityBand`    — 구간 이름이 곧 판정이다
//     · `GrowBars`        — 강의 어휘(원씽·조감도)는 인도자 해석용이다
//     · `FacilitatorPanel`·`RawAnswers` — 인도자 전용 명시
//   남는 둘(나침반·간격)은 **본인이 적은 답을 그대로 되비추는 것**이라 판정이 아니다.
//
// ★ **표제부는 사본을 만들지 않았다** — 인도자 리포트의 `ReportPrintHeader` 를 그대로 쓴다
//   (`screen` 으로 화면에도 세운다). 도구 셋은 빼 두었다:
//   «회원 프로필»(신상정보 · ADR-75) · «인도자 해석» · «인쇄» — 앞의 둘은 인도자 것이고
//   인쇄는 인도자 문서 헤더에 묶여 있어 1차 범위를 넘는다(지휘부 보고 그대로).
//
// **하드룰 중 남은 것**: scores 를 저장하지 않는다(재채점) · 본인 스코프(RLS responses_select user_id=auth.uid()).
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Answers } from '@/contracts';
import { MirrorView } from '@/app/_screens/MirrorView';
import { requestContext, requestUser } from '@/app/_lib/requestScope';
import { participantMirror } from '@/instruments/futurenow/participantMirror';
import { futurenowScoring, type FuturenowScores } from '@/instruments/futurenow/scoring';
import { latestPerUser } from '@/app/_lib/latestPerUser';
import { TOOL, toolName } from '@/app/_vocab/tool';
import { Panel } from '@/instruments/futurenow/report/ReportScreen';
import { CompassDumbbell, GapRadar } from '@/instruments/futurenow/report/visuals';
import { SUBJECTIVE_LABELS } from '@/instruments/futurenow/report/labels';
import { ReportPrintHeader } from '@/app/coach/cohort/[cohortId]/report/[responseId]/ReportPrintHeader';

export const dynamic = 'force-dynamic';

function ymd(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default async function MyReportPage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  // ★ **한 렌더에 한 번만 묻는다**(ADR-178 · U-6 이 나머지 회원 화면으로 넓혐다).
  const ctx = await requestContext();
  const me = await requestUser();
  if (!me) redirect('/login'); // 전 역할 개방(A′-1 정합) — 본인 참여분만. RLS 가 본인 스코프.

  // 본인 사전·사후 각 wave 최신 1건(재진단 dedup). **한 번 채점해 차트와 거울이 같은 산출을 쓴다** —
  //   두 번 채점하면 언젠가 둘이 갈라지고, 그때 어느 쪽이 맞는지 알 수 없다.
  const scoredFor = async (wave: 'pre' | 'post') => {
    const rs = await ctx.listResponses<Answers, unknown>({ instrumentId: 'futurenow', cohortId, userId: me.id, wave });
    const r = latestPerUser(rs)[0] ?? null;
    return r ? { scores: futurenowScoring.score(r.answers, { wave: r.wave }) as FuturenowScores, at: r.createdAt, wave: r.wave } : null;
  };
  const [pre, post] = await Promise.all([scoredFor('pre'), scoredFor('post')]);
  const latest = post ?? pre;                 // 지금 보여 줄 것
  const prevScores = post && pre ? pre.scores : undefined; // 둘 다 있으면 사전→사후를 한 그림에
  const preMirror = pre ? participantMirror(pre.scores) : null;
  const postMirror = post ? participantMirror(post.scores) : null;
  const both = !!preMirror && !!postMirror;
  const single = postMirror ?? preMirror;

  if (!latest) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
        <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>
          아직 {TOOL.short} 결과가 없어요. 받은 코드로 참여하면 결과를 볼 수 있어요.
        </p>
        <Link className="ui-btn ui-btn--primary" href="/join" style={{ width: '100%', textDecoration: 'none' }}>
          받은 코드로 참여
        </Link>
      </div>
    );
  }

  const cohort = (await ctx.listMyCohorts().catch(() => [])).find((c) => c.cohortId === cohortId);
  const subj = latest.scores.subjective;
  const hasSubjective = !!(subj.E1 || subj.E2 || subj.E3);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* 표제부 — 인도자용과 **같은 부품**이다(사본 0). */}
      <ReportPrintHeader
        screen
        participantName={me.name?.trim() || '참여자'}
        cohortName={cohort?.name ?? ''}
        waveLabel={toolName(latest.wave)}
        dateStr={ymd(latest.at)}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
        {/* 차트 둘 — 인도자 리포트와 **같은 부품**이다. 사전·사후가 다 있으면 한 그림에 겹친다. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
          <Panel title="나침반 — 마음이 향하는 쪽">
            <CompassDumbbell scores={latest.scores} prev={prevScores} />
          </Panel>
          <Panel title="다섯 영역의 간격">
            <GapRadar scores={latest.scores} prev={prevScores} />
          </Panel>
        </div>

        {/* 내가 적은 글 — 있을 때만 그린다(빈 상자를 두지 않는다). */}
        {hasSubjective && (
          <Panel title="나에게 묻는 시간">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {(['E1', 'E2', 'E3'] as const).map((k) =>
                subj[k] ? (
                  <div key={k}>
                    <div className="t-caption" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
                      {SUBJECTIVE_LABELS[k]}
                    </div>
                    <p className="t-body" style={{ color: 'var(--color-text)', margin: 0, whiteSpace: 'pre-line' }}>
                      {subj[k]}
                    </p>
                  </div>
                ) : null,
              )}
            </div>
          </Panel>
        )}
      </div>

      {/* ── 여기부터가 **옛 참여자 리포트 그대로**다(지시: 「그 아래 현재 내용」). 한 글자도 안 바꿨다. ── */}
      <div style={{ marginTop: 'var(--space-6)' }}>
        {both ? (
          <div>
            <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-6)' }}>
              세미나 전과 후, 당신의 마음이 어떻게 움직였는지 나란히 놓아봤어요.
            </p>
            <section style={{ marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-6)', borderBottom: 'var(--border-hair) solid var(--color-border)' }}>
              <p className="t-caption" style={{ color: 'var(--color-text-secondary)', fontWeight: 600, margin: '0 0 var(--space-3)' }}>세미나 전 · {TOOL.pre}</p>
              <MirrorView mirror={preMirror!} />
            </section>
            <section>
              <p className="t-caption" style={{ color: 'var(--color-primary)', fontWeight: 600, margin: '0 0 var(--space-3)' }}>세미나 후 · 지금</p>
              <MirrorView mirror={postMirror!} />
              {postMirror!.faith ? (
                <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-5) 0 0' }}>{postMirror!.faith}</p>
              ) : null}
            </section>
          </div>
        ) : (
          <div>
            <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-6)' }}>
              지난 {TOOL.short}에서 당신의 마음이 향한 곳이에요.
            </p>
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <MirrorView mirror={single!} />
            </div>
            {single!.faith ? (
              <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{single!.faith}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
