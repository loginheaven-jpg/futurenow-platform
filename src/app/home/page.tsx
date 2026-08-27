// 통합 홈(/home) — 모든 로그인 사용자의 허브(A′-1 역할 감금 해제). 서버 컴포넌트(세션 의존 → force-dynamic).
// 게이트: 미인증 → /login 만. 역할 리다이렉트 제거(홈은 전원 개방 — 콘솔·본부는 자격 게이트가 별도로 방어).
//
// **4차 F-3 에서 보이는 층을 시안 B(로그인 홈)·E(전체 메뉴 시트)로 교체했다.**
//   바뀐 것은 **무엇으로 그리는가**뿐이다 — 아래 셋은 한 줄도 건드리지 않았다(지휘부 확인 사항):
//     · 개인정보 동의 소급 게이트(ADR-76)
//     · 복귀 안내 판정(ADR-91 B — prompt_count·마감 6시간)
//     · `MemberHome` 본문(운영 카드·진행 중 진단·내 활동·코드 참여)
//   `AppHeader` → `SiteGnb variant="member"` + `MenuSheet`, `RoleCard` → `SiteRoleCard`,
//   `FeedShortcut` → `QuickTiles` 한 칸으로 옮겼고 **목적지는 전부 그대로다**.
import { redirect } from 'next/navigation';
import { MemberHome } from '@/app/_screens/MemberHome';
import { CheckinPrompt } from '@/app/_screens/CheckinPrompt';
import { ConsentGate } from '@/app/_consent/ConsentGate';
import { CONSENT_VERSION } from '@/app/_consent/consent';
import { createServerContext } from '@/core/supabase/server';
import type { QuickTile } from '@/app/_screens/site/QuickTiles';
import type { NewsRowItem } from '@/app/_screens/site/NewsRow';
import { HomeScreen } from './HomeScreen';
import type { MenuGroup } from '@/app/_screens/site/MenuSheet';
import { recentNews } from '@/app/_lib/publicNews';
import { shortDate } from '@/app/_lib/shortDate';
import { roleTarget } from './roleTarget';
import { buildSessionChips } from './sessionChips';
import { openedSessionNos } from '@/app/my/cohorts/[cohortId]/progress';

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

  // 동행 피드 바로가기(2차 · 발주 §6.3) — **탭바를 짓지 않기로 확정**했으므로 진입은 기존 표면으로 낸다.
  //   피드를 가진 기수가 없으면 타일 자체를 그리지 않는다(없는 곳으로 보내지 않는다 · 옛 `FeedShortcut` 규율 그대로).
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

  const target = roleTarget(me.role, cohorts);
  const active = cohorts.filter((c) => c.status === 'active');
  const primary = active.length === 1 ? active[0] : null;

  // 시안 E 회차 칩 — **활성 차수가 하나일 때만** 만든다. 여럿이면 어느 기수의 회차인지 말할 수 없고,
  //   시트는 *내* 여정을 보이는 자리라 임의로 하나를 고르지 않는다(`roleTarget` 과 같은 판단).
  //   제출 조회는 **이미 열린 회차에만** 팬아웃한다(`openedSessionNos`) — 미래 회차는 제출이 있을 수 없다.
  //   차수 홈(`/my/cohorts/[cohortId]`)이 쓰는 것과 **같은 방식**이고 계약·DB 델타 0 이다.
  let chips: ReturnType<typeof buildSessionChips> = [];
  if (primary) {
    const sessions = await ctx.listCohortSessions(primary.cohortId).catch(() => []);
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const submitted = new Set(
      (
        await Promise.all(
          openedSessionNos(sessions, now).map(async (n) => {
            const row = await ctx.getMyCheckin(primary.cohortId, n).catch(() => null);
            return row?.submittedAt != null ? n : null;
          }),
        )
      ).filter((n): n is number => n != null),
    );
    chips = buildSessionChips({ cohortId: primary.cohortId, sessions, submitted, openSessionNo: primary.openSessionNo, now });
  }

  // 시안 B `.quick-grid` — 네 칸. **갈 수 없는 곳은 칸을 만들지 않는다.**
  const tiles: QuickTile[] = [
    ...(primary && primary.openSessionNo != null
      ? [{ icon: 'checkin' as const, title: '오늘의 갈무리', hint: `${primary.openSessionNo}회차`, href: `/my/cohorts/${primary.cohortId}/checkin/${primary.openSessionNo}` }]
      : []),
    ...(primary ? [{ icon: 'mirror' as const, title: '되비추기', hint: '나의 기록', href: `/my/cohorts/${primary.cohortId}/journey` }] : []),
    ...(feedCohorts.length > 0 ? [{ icon: 'feed' as const, title: '동행', hint: '기수와 함께', href: '/feed' }] : []),
    { icon: 'library' as const, title: '자료실', hint: '배포 자료', href: '/library' },
  ];

  // 시안 B `.notice` — 소식 한 줄. 없으면 구획째 그리지 않는다(현관과 같은 규율).
  const news = await recentNews(2).catch(() => []);
  const newsRows: NewsRowItem[] = news.map((n) => ({ id: n.id, title: n.title, date: shortDate(n.publishedAt), href: `/news/${n.id}` }));

  // 시안 E 그룹 — **계정 그룹에 로그아웃이 없다.** 로그아웃은 폼 액션이라 링크 목록에 섞지 않는다.
  //   `/account` 안에 이미 있고, 시트에서 한 번 더 내면 같은 것이 두 곳에 산다.
  const groups: MenuGroup[] = [
    {
      title: '여정',
      items: [
        ...(primary ? [{ href: `/my/cohorts/${primary.cohortId}`, label: '내 기수' }] : [{ href: '/my/cohorts', label: '내 기수' }]),
        ...(feedCohorts.length > 0 ? [{ href: '/feed', label: '동행' }] : []),
      ],
    },
    { title: '진단', items: [{ href: '/home/assessments', label: '체크 허브' }, { href: '/my/values', label: '가치 카드' }] },
    { title: '자료', items: [{ href: '/library', label: '자료실' }, { href: '/news', label: '소식' }] },
    { title: '계정', items: [{ href: '/account', label: '내 정보' }] },
  ];

  return (
    <HomeScreen
      who={{ name: greetingName, role: target.who, cohort: primary?.name }}
      role={{ badge: target.cohort, who: target.who, title: target.title, sub: target.sub, href: target.href, ctaLabel: target.ctaLabel }}
      tiles={tiles}
      news={newsRows}
      groups={groups}
      chips={chips}
      prompt={prompt ? <CheckinPrompt {...prompt} /> : null}
    >
      {/* **무접촉** — 운영 카드·진행 중 진단·내 활동·코드 참여는 이번 회차에서 한 줄도 손대지 않았다. */}
      <MemberHome greetingName={greetingName} cohorts={cohorts} role={me.role} pendingCoachApps={pendingCoachApps} />
    </HomeScreen>
  );
}
