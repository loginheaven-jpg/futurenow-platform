// 개인 리포트(코치/운영자 전용). getResponse→B② score→기존 ReportScreen 재사용(신규 리포트 0).
// 접근 제어: responses RLS(회기 코치+운영자+본인만 SELECT). 차단/부재 → 404. 참여자는 이 임상 리포트 UI 경로 없음(§7.5 거울만).
// wave 비교(prev)는 후속 — MVP 는 단일 wave 로 충분(ReportScreen 이 prev optional 처리).
import { docTitle } from '@/app/_screens/console/docTitle';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Answers } from '@/contracts';
import { requestCohort, requestContext, requestUser } from '@/app/_lib/requestScope';
import { ReportScreen } from '@/instruments/futurenow/report/ReportScreen';
import { RawAnswers } from '@/instruments/futurenow/report/RawAnswers';
import { futurenowScoring } from '@/instruments/futurenow/scoring';
import type { InterpretationContent } from '@/instruments/futurenow/report/interpretation';
import { InterpretationPanel } from './InterpretationPanel';
import { MemberProfileButton } from './MemberProfileButton';
import { ReportPrintButton } from './ReportPrintButton';
import { ReportPrintHeader } from './ReportPrintHeader';
import { toolName } from '@/app/_vocab/tool';

export const dynamic = 'force-dynamic';
// 비차단(B③-A): 서버 렌더는 existing 해석(getInterpretation·빠름)만 조회 — aiChat 동기 await 제거(첫 열람 26s 블랭크 회피).
// 생성(게이트웨이 ~수십초)은 InterpretationPanel 이 마운트 후 ensureInterpretationAction 으로 돌린다. maxDuration=60 은 그 액션 예산.
export const maxDuration = 60;

export default async function CoachReportPage({
  params,
}: {
  params: Promise<{ cohortId: string; responseId: string }>;
}) {
  const { cohortId, responseId } = await params;
  // ★ **한 렌더에 한 번만 묻는다**(ADR-178 · U-6 이 콘솔로 넓혔다) — 껍데기가 이미 물은 것을 다시 묻지 않는다.
  const ctx = await requestContext();
  const me = await requestUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home'); // 코치/운영자 전용 — 멤버는 자기 집으로

  const resp = await ctx.getResponse<Answers, unknown>(responseId).catch(() => null);
  if (!resp) notFound(); // RLS 차단(비소유 코치)·부재 → 404

  const scores = futurenowScoring.score(resp.answers, { wave: resp.wave });

  // PDF 문서 헤더용 메타(대상·회기·회차·날짜). 코치는 소유 회기라 getCohort·listCohortMembers 통과(RLS). 실패는 우아한 폴백.
  const [cohort, members] = await Promise.all([
    requestCohort(resp.cohortId ?? cohortId).catch(() => null),
    ctx.listCohortMembers(resp.cohortId ?? cohortId).catch(() => []),
  ]);
  const participantName = members.find((m) => m.userId === resp.userId)?.name ?? '참여자';
  const cohortName = cohort?.name ?? '';
  const waveLabel = toolName(resp.wave);
  const [ry, rm, rd] = resp.createdAt.slice(0, 10).split('-');
  const dateStr = `${ry}년 ${Number(rm)}월 ${Number(rd)}일`;

  // 비차단(B③-A): existing 해석만 즉시 조회(빠름). 없으면 null → 패널이 마운트 후 생성 트리거.
  //   게이트웨이 동기 블로킹 제거 → 리포트 시각화가 첫 열람부터 즉시 렌더. 해석 실패는 패널이 재시도 안내(시각화 무관).
  // 초기 VM(B③-B): effective(coach본 우선) + AI 원문(되돌리기 대상) + 코치 수정 여부(출처·되돌리기 노출).
  const existing = await ctx.getInterpretation(responseId).catch(() => null);
  const initialVm =
    existing && existing.effective && existing.aiContent
      ? {
          effective: existing.effective as InterpretationContent,
          ai: existing.aiContent as InterpretationContent,
          coachEdited: existing.coachContent != null,
        }
      : null;

  // 신상정보(ADR-75): 이 회기 코치·운영자만(cohort_member_detail 내부 게이트). 실패·부재 → 패널 미표시(우아한 저하).
  const memberDetail = resp.userId
    ? await ctx.getCohortMemberDetail(resp.cohortId ?? cohortId, resp.userId).catch(() => null)
    : null;

  return (
    <div className="report-print-root" style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* 앱 크롬(헤더·PDF 버튼) — 화면 전용(인쇄 제외) */}
      <div className="no-print">

        {/* 툴바 — 신상정보(팝업)·PDF. 신상정보는 홈→멤버관리 왕복 없이 리포트에서 바로(ADR-78). */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          {/* 갈무리 왕복(ADR-118) — 나침반 점수를 보다가 '이 사람이 실제로 무엇을 하고 있지'를 물으면
              화면을 나가야 했다. 두 문서가 서로를 알되 섞이지 않는다. */}
          {resp.userId ? (
            <Link
              className="t-caption"
              href={`/coach/cohort/${resp.cohortId ?? cohortId}/member/${resp.userId}`}
              style={{ display: 'inline-flex', alignItems: 'center', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius)', border: 'var(--border-hair) solid var(--color-border)', color: 'var(--color-primary)', textDecoration: 'none' }}
            >
              갈무리 기록 보기
            </Link>
          ) : null}
          {memberDetail ? <MemberProfileButton detail={memberDetail} /> : null}
          <ReportPrintButton />
        </div>
      </div>
      {/* PDF 전용 브랜드 문서 헤더(화면 미노출) */}
      {/* ★★ **이 화면은 «문서»다** — 이름의 자리가 `ConsoleTitle` 이 아니라 **문서 머리**다(U-6).
          실측: `ReportPrintHeader` 의 `wrap` 이 인라인 `display:flex` 라 `.print-only` 를 이겨
          **이 머리는 화면에도 서 있다**(그래서 ADR-188 의 `screen` 소품은 아무 일도 하지 않는다 — 보고 항목).
          그 머리가 이미 «퓨처나우 · 문서 이름 · 대상자 · 회기 · 회차 · 날짜» 를 한 덩어리로 든다.
          위에 `ConsoleTitle` 을 또 세우면 **한 화면에 같은 이름이 둘**이다(배포해서 눈으로 잡았다).
          **이름은 표에서 읽어 넘긴다** — 부품 기본값을 쓰면 표와 갈라진다(`/report` 가 실제로 그랬다:
          표 「개인 리포트」 vs 기본값 「개인 체크 리포트」). */}
      <ReportPrintHeader title={docTitle('/coach/cohort/[cohortId]/report/[responseId]')} participantName={participantName} cohortName={cohortName} waveLabel={waveLabel} dateStr={dateStr} />
      {/* 화면 순서: 해석(위) → 차트(아래). PDF 인쇄에서만 order 로 차트=1페이지·해석=2페이지로 재배치(ADR-69). */}
      <div className="report-interp-block">
        {/* **key 가 정확성이다**(3차 T-2 · 발현 확인 2026-08-27).
            리포트→리포트 이동(`MemberJourney` 형제 링크)은 같은 자리에 같은 컴포넌트를 다시 그린다.
            재마운트가 없으면 남는 것이 표시 하나가 아니다 —
              · `vm` 이 **이전 참여자의 해석**을 붙든다
              · `triggered` ref 가 살아남아 다음 리포트를 **영영 다시 부르지 않는다**
              · `editing`·`draft` 가 살아, 편집 중 이동해 저장하면
                `saveCoachInterpretationAction(responseId=B, content=A의 초안)` 이 되어
                **A의 해석이 B의 기록에 써진다.** 표시 결함이 아니라 데이터 오염이다.
            인도자가 A의 화면에서 B의 해석을 읽고 코칭하면 잘못된 사람을 읽는 것이고,
            그 위험이 갈무리 쪽보다 무겁다. */}
        <InterpretationPanel key={responseId} responseId={responseId} initial={initialVm} />
      </div>
      <div className="report-charts-block" style={{ marginTop: 'var(--space-4)' }}>
        <ReportScreen scores={scores} />
      </div>
      {/* 3면 — 참여자 원응답(코치/운영자 전용). 화면 접이식·PDF 펼침(order 3·개행). ADR-77 Phase 2 */}
      <div className="report-raw-block" style={{ marginTop: 'var(--space-4)' }}>
        <RawAnswers answers={resp.answers as Record<string, unknown>} wave={resp.wave} />
      </div>
    </div>
  );
}
