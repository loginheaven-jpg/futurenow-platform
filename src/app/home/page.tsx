// 통합 홈(/home) — 모든 로그인 사용자의 허브(A′-1 역할 감금 해제). 서버 컴포넌트(세션 의존 → force-dynamic).
// 게이트: 미인증 → /login 만. 역할 리다이렉트 제거(홈은 전원 개방 — 콘솔·본부는 자격 게이트가 별도로 방어).
//   코치·운영자에겐 MemberHome 이 '운영' 진입 카드(→/coach·/admin)를 노출. 데이터 접근은 RLS 불변(홈 개방=UX 이득).
// 셸 헤더(AppHeader) + 로그아웃(LogoutButton) + MemberHome(인사·운영 카드·참여·내 차수 자리). 계약·DB 무변경.
import { redirect } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { MemberHome } from '@/app/_screens/MemberHome';
import { RoleCard } from '@/app/_screens/RoleCard';
import { FeedShortcut } from '@/app/_screens/FeedShortcut';
import { CheckinPrompt } from '@/app/_screens/CheckinPrompt';
import { ConsentGate } from '@/app/_consent/ConsentGate';
import { CONSENT_VERSION } from '@/app/_consent/consent';
import { createServerContext } from '@/core/supabase/server';

export const dynamic = 'force-dynamic';

export default async function MemberHomePage() {
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');

  // 개인정보 동의 소급 게이트(ADR-76): 필수(privacy_use) 최신 버전 미동의면 홈 대신 동의 화면. 기존 회원 소급.
  const consents = await ctx.listMyConsents().catch(() => []);
  const consented = consents.some((c) => c.type === 'privacy_use' && c.version === CONSENT_VERSION);
  if (!consented) return <ConsentGate />;

  const greetingName = me.name?.trim() || me.email.split('@')[0] || '회원';
  const cohorts = await ctx.listMyCohorts(); // my_cohorts DEFINER RPC(본인 차수+진행). 앱은 cohorts·responses 직접 select 안 함.
  // 운영자 로그인 알림(정합 마감): admin 은 /home 착지(loginOutcome 전원 /home)이므로 승인 대기 건수를 '본부' 카드에 노출(A3 배너를 홈에서도).
  const pendingCoachApps = me.role === 'admin' ? (await ctx.listCoachApplications('pending').catch(() => [])).length : 0;

  // 복귀 안내(ADR-91 B) — 열린 회차가 있고 아직 제출 안 한 차수 하나에 대해서만.
  //   노출 조건: 첫 진입(prompt_count 0) 또는 마감 6시간 전 이후(prompt_count 1). 상한 2는 RPC 가 강제.
  //   비용: 대상이 있을 때만 getMyCheckin·listCohortSessions 각 1회가 는다(my_cohorts 가 prompt_count 를
  //   반환하지 않아 불가피하다). 11명 규모라 감수한다 — 기수가 늘면 그때 RPC 에 얹는다(B3).
  //   /my/cohorts 에는 두지 않는다: 차수가 하나면 차수 홈으로 리다이렉트하므로 실효 지점이 /home 이다.
  // 동행 피드 바로가기(2차 · 발주 §6.3) — **탭바를 짓지 않기로 확정**했으므로 진입은 기존 표면으로 낸다.
  //   피드를 가진 기수가 없으면 줄 자체를 그리지 않는다(없는 곳으로 보내지 않는다 · S-4 §6.2 판단).
  //   조회 실패는 빈 배열이다 — 바로가기가 없는 것과 홈이 안 열리는 것은 심각도가 다르다.
  const feedCohorts = await ctx.listFeedCohorts().catch(() => []);

  const open = cohorts.find((c) => c.openSessionNo != null && !c.openSessionSubmitted);
  let prompt: { cohortId: string; sessionNo: number; hasContent: boolean; shouldPrompt: boolean } | null = null;
  if (open && open.openSessionNo != null) {
    const [row, sessions] = await Promise.all([
      ctx.getMyCheckin(open.cohortId, open.openSessionNo).catch(() => null),
      ctx.listCohortSessions(open.cohortId).catch(() => []),
    ]);
    const closesAt = sessions.find((s) => s.sessionNo === open.openSessionNo)?.closesAt;
    // eslint-disable-next-line react-hooks/purity
    const finalWindow = closesAt ? Date.now() >= new Date(closesAt).getTime() - 6 * 60 * 60 * 1000 : false;
    const count = row?.promptCount ?? 0;
    prompt = {
      cohortId: open.cohortId,
      sessionNo: open.openSessionNo,
      hasContent: open.openSessionHasContent,
      shouldPrompt: count === 0 || (count === 1 && finalWindow),
    };
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="root" title="퓨처나우" subtitle="내 자리" homeHref="/home" action={<HeaderActions homeHref="/home" />} />
      {prompt ? <CheckinPrompt {...prompt} /> : null}
      {/* 역할 카드 — 통합 홈 최상단에 하나(IA 설계철학 원칙 3 · 발주서 §6).
          **탭 한 번을 넘지 않는다**: 참여자는 차수 홈, 인도자는 콘솔, 운영자는 본부.
          역할 감금 해제(ADR-51)는 그대로다 — 이 카드는 **거점을 가리키는 것**이지 가두는 것이 아니고,
          아래 MemberHome 이 다른 길을 계속 연다. */}
      <RoleCard role={me.role} cohorts={cohorts} />
      <FeedShortcut count={feedCohorts.length} />
      <MemberHome greetingName={greetingName} cohorts={cohorts} role={me.role} pendingCoachApps={pendingCoachApps} />
    </div>
  );
}
