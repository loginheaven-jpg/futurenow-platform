// 통합 홈(/home) — 모든 로그인 사용자의 허브(A′-1 역할 감금 해제). 서버 컴포넌트(세션 의존 → force-dynamic).
// 게이트: 미인증 → /login 만. 역할 리다이렉트 제거(홈은 전원 개방 — 콘솔·본부는 자격 게이트가 별도로 방어).
//
// **4차 F-3 에서 보이는 층을 시안 B(로그인 홈)·E(전체 메뉴 시트)로 교체했다.**
//   바뀐 것은 **무엇으로 그리는가**뿐이다 — 아래 셋은 한 줄도 건드리지 않았다(지휘부 확인 사항):
//     · 개인정보 동의 소급 게이트(ADR-76)
//     · 복귀 안내 판정(ADR-91 B — prompt_count·마감 6시간)
//     · `MemberHome` 본문(운영 카드·진행 중 진단·내 활동·코드 참여)
//   `AppHeader` → `SiteGnb variant="member"` + `MenuSheet`, `RoleCard` → `SiteRoleCard`,
//   `FeedShortcut` → `QuickTiles` 한 칸으로 옮겼고 **목적지는 전부 그대로다**
//   (그 파일은 F-4 에서 삭제했다 — 고아로 남기면 다음 사람이 살아 있는 줄 알고 고친다).
import { redirect } from 'next/navigation';
import { MemberHome } from '@/app/_screens/MemberHome';
import { CheckinPrompt } from '@/app/_screens/CheckinPrompt';
import { ConsentGate } from '@/app/_consent/ConsentGate';
import { CONSENT_VERSION } from '@/app/_consent/consent';
import { requestContext, requestUser, requestConsents, requestCohorts } from '@/app/_lib/requestScope';
import type { QuickTile } from '@/app/_screens/site/QuickTiles';
import type { NewsRowItem } from '@/app/_screens/site/NewsRow';
import { HomeScreen } from './HomeScreen';
import { recentNews } from '@/app/_lib/publicNews';
import { shortDate } from '@/app/_lib/shortDate';
import { roleTargets } from './roleTarget';
import { LIBRARY_NAME } from '@/app/_vocab/library';

export const dynamic = 'force-dynamic';

export default async function MemberHomePage() {
  // ★ 껍데기가 이미 물은 것을 **다시 묻지 않는다**(ADR-178) — 같은 렌더면 같은 값이다.
  const ctx = await requestContext();
  const me = await requestUser();
  if (!me) redirect('/login');

  // 개인정보 동의 소급 게이트(ADR-76): 필수(privacy_use) 최신 버전 미동의면 홈 대신 동의 화면. 기존 회원 소급.
  const consents = await requestConsents();
  const consented = consents.some((c) => c.type === 'privacy_use' && c.version === CONSENT_VERSION);
  if (!consented) return <ConsentGate />;

  const greetingName = me.name?.trim() || me.email.split('@')[0] || '회원';
  const cohorts = await requestCohorts(); // my_cohorts DEFINER RPC(본인 차수+진행). 앱은 cohorts·responses 직접 select 안 함.
  // 운영자 로그인 알림(정합 마감): admin 은 /home 착지(loginOutcome 전원 /home)이므로 승인 대기 건수를 '본부' 카드에 노출(A3 배너를 홈에서도).
  const pendingCoachApps = me.role === 'admin' ? (await ctx.listCoachApplications('pending').catch(() => [])).length : 0;

  // 동행 피드 바로가기(2차 · 발주 §6.3) — **탭바를 짓지 않기로 확정**했으므로 진입은 기존 표면으로 낸다.
  //   피드를 가진 기수가 없으면 타일 자체를 그리지 않는다 — **없는 곳으로 보내지 않는다.**
  //   이 규율은 삭제된 `FeedShortcut` 이 지키던 것이고, 파일을 지우면서 규율은 여기로 옮겨 왔다.
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

  // ── 여기서부터가 F-3 이 더한 **표시용 자료**다. 위 판정에는 손대지 않았다. ──────────

  const targets = roleTargets(me.role, cohorts); // 5차 T-5 — 겸직자는 여럿이다

  // 좁은 자리(시트 머리) 값. 실패해도 화면이 멈추지 않게 기본값으로 받는다.
  const active = cohorts.filter((c) => c.status === 'active');
  const primary = active.length === 1 ? active[0] : null;

  // 시트 자료는 **한 곳에서 만든다**(`buildMemberSheet`) — /home·차수 홈·진단 홈이 같은 시트를
  //   각자 조립하면 메뉴 하나가 늘 때 세 곳이 어긋난다(불변식 23).

  // 시안 B `.quick-grid` — 네 칸. **갈 수 없는 곳은 칸을 만들지 않는다.**
  const tiles: QuickTile[] = [
    ...(primary && primary.openSessionNo != null
      ? [{ icon: 'checkin' as const, title: '오늘의 갈무리', hint: `${primary.openSessionNo}회차`, href: `/my/cohorts/${primary.cohortId}/checkin/${primary.openSessionNo}` }]
      : []),
    ...(primary ? [{ icon: 'mirror' as const, title: '되비추기', hint: '나의 기록', href: `/my/cohorts/${primary.cohortId}/journey` }] : []),
    ...(feedCohorts.length > 0 ? [{ icon: 'feed' as const, title: '동행', hint: '기수와 함께', href: '/feed' }] : []),
    { icon: 'library' as const, title: LIBRARY_NAME, hint: '배포 자료', href: '/library' },
  ];

  // 시안 B `.notice` — 소식 한 줄. 없으면 구획째 그리지 않는다(현관과 같은 규율).
  const news = await recentNews(2).catch(() => []);
  const newsRows: NewsRowItem[] = news.map((n) => ({ id: n.id, title: n.title, date: shortDate(n.publishedAt), href: `/news/${n.id}` }));

  return (
    <HomeScreen
      // **좁은 자리 규칙**(최박사 확정 2026-08-30) — 시트 머리는 한 칸뿐이라 병행이 안 된다.
      //   `참여자·인도자·운영자` 를 자격 이름보다 앞세우고, 동점은 **최근 기수 포지션**이다.
      //   `narrowLabel` 이 `null` 을 주면(소속도 운영자도 아니면) 쓰던 값을 그대로 쓴다.
      roles={targets.map((t) => ({
        badge: t.cohort, who: t.who, title: t.title, sub: t.sub, href: t.href, ctaLabel: t.ctaLabel,
      }))}
      tiles={tiles}
      news={newsRows}
      prompt={prompt ? <CheckinPrompt {...prompt} /> : null}
    >
      {/* **무접촉** — 운영 카드·진행 중 진단·내 활동·코드 참여는 이번 회차에서 한 줄도 손대지 않았다. */}
      <MemberHome greetingName={greetingName} cohorts={cohorts} role={me.role} pendingCoachApps={pendingCoachApps} />
    </HomeScreen>
  );
}
