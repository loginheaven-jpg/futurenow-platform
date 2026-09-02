// 회원 껍데기가 서는 자리 (U-2 · `design_system.md` §12).
//
// **라우트 그룹 `(member)` 다** — URL 에 나타나지 않는다. U-1 의 `(public)` 과 같은 방식이다.
//
// ─────────────────────────────────────────────────────────────────────────────
// **동의 미완이면 껍데기를 두르지 않는다**(지휘부 판정 2026-09-01).
//
//   `/home` 은 동의가 없으면 홈 대신 `<ConsentGate/>` 를 그리고(ADR-76), 그 부품은
//   **자기 헤더를 그린다.** 껍데기를 씌우면 헤더가 둘이 된다 — U-3 이 고치려는 바로 그 모양이다.
//
//   **동의 게이트는 회원 영역에 들어가기 «전에» 서는 문이므로 안에 있지 않다.**
//   그래서 면제가 아니라 **바깥**으로 둔다. 고치는 자리가 부품이 아니라 여기가 되고,
//   `ConsentGate` 파일은 **한 줄도 바뀌지 않는다**(§4 무접촉과 §2 걷기가 함께 지켜진다).
//
//   시트 조회도 이것으로 정해진다 — **껍데기를 안 두르면 시트 조회도 안 돈다.**
// ─────────────────────────────────────────────────────────────────────────────
import { redirect } from 'next/navigation';
import { requestContext, requestUser, requestConsents, requestCohorts } from '@/app/_lib/requestScope';
import { CONSENT_VERSION } from '@/app/_consent/consent';
import { roleTargets, homeIsCohortDashboard } from '@/app/(member)/home/roleTarget';
import { buildMemberSheet } from '@/app/_lib/memberSheet';
import { ChromeProvider } from '@/app/_screens/shell/chromeContext';
import { MemberShell } from '@/app/_screens/shell/MemberShell';
import { COHORT_ROLE_LABEL } from '@/core/membershipVocab';

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  // ★ **한 렌더에 한 번만 묻는다**(ADR-178). 껍데기와 화면이 각자 컨텍스트를 만들면
  //   `users` SELECT·동의·차수가 **두 벌씩** 돈다 — 인스턴스 메모는 인스턴스가 둘이면 안 듣는다.
  const ctx = await requestContext();
  const me = await requestUser();
  if (!me) redirect('/login');

  // **판정만 하고 화면을 바꾸지 않는다.** 어떤 화면을 그릴지는 여전히 `/home` 이 정한다 —
  //   여기서 `ConsentGate` 를 그리면 그 결정이 두 곳에 살게 된다(불변식 23).
  // ★ **동의 조회와 차수 조회를 함께 기다린다**(ADR-176). 서로를 인자로 쓰지 않는데
  //   직렬이라 **모든 회원 화면의 착지 앞에 왕복 하나가 더 줄을 서 있었다.**
  //   ★ **인증 게이트는 위에서 이미 지났다**(불변식 19 — 게이트가 먼저).
  //   아래 동의 판정은 *권한*이 아니라 **껍데기를 씌울지**를 정하는 화면 판정이고,
  //   여기서 당겨오는 것은 **본인의 차수**다(RLS 가 본인 것만 낸다). 미동의자에게는
  //   그 조회가 헛돌지만 새어 나가는 것은 없다 — 값이 아니라 왕복 하나를 버리는 것뿐이다.
  const [consents, cohorts] = await Promise.all([
    requestConsents(),
    // 삼킴은 **부르는 자리에** 그대로 남긴다 — 홈은 안 삼킨다(성질을 파생하지 않는다).
    requestCohorts().catch(() => []),
  ]);
  const consented = consents.some((c) => c.type === 'privacy_use' && c.version === CONSENT_VERSION);
  if (!consented) return <>{children}</>;

  const active = cohorts.filter((c) => c.status === 'active');
  // ★ 시트가 **출구와 옮겨 온 문들**을 든다(ADR-181). 판정에 쓰는 값은 여기서 한 번만 센다 —
  //   「회기가 몇이냐」를 화면마다 다르게 세던 것이 이번 회차가 드러낸 결함이다(전체/활성/전체 셋).
  //   **여기서는 전체를 센다** — 시트의 「내 세미나」는 보관된 회기도 보여 주는 목록이기 때문이다.
  //
  //   ★ 억제 주석은 `Date.now()` **바로 앞줄**에 있어야 듣는다 — 설명을 사이에 끼웠다가
  //   억제가 끊겨 린트가 붉어졌고, 객체를 여러 줄로 펼치자 그 줄이 또 내려갔다(둘 다 그 자리에서 잡았다).
  const reportCohort = cohorts.filter((c) => c.preDone);
  const sheetData = await buildMemberSheet(ctx, cohorts, {
    hasFeed: active.length > 0,
    // 서버 컴포넌트(요청 시점 벽시계) — 회차 개폐 판정에 필수다.
    // eslint-disable-next-line react-hooks/purity
    now: Date.now(),
    role: me.role,
    cohortCount: cohorts.length,
    // 홈이 곧 회기 화면이면 시트에 「내 회기」를 또 두지 않는다 — 판정은 `roleTarget` 한 곳이다.
    homeIsDashboard: homeIsCohortDashboard(roleTargets(me.role, cohorts)),
    // 리포트는 **갈 곳이 하나로 정해질 때만** 낸다 — 여럿이면 어느 것인지 말할 수 없다.
    reportCohortId: reportCohort.length === 1 ? reportCohort[0].cohortId : null,
  })
    .catch(() => null);

  const sheet = sheetData
    ? {
        name: me.name?.trim() || me.email.split('@')[0] || '회원',
        role: me.role === 'coach' ? COHORT_ROLE_LABEL.coach : COHORT_ROLE_LABEL.participant,
        cohort: sheetData.cohortName,
        groups: sheetData.groups,
        chips: sheetData.chips,
      }
    : null;

  return (
    // **통로가 껍데기와 화면을 함께 감싼다**(U-4 §1) — 화면이 알려 온 크롬을 껍데기가 읽는다.
    <ChromeProvider>
      <MemberShell sheet={sheet}>{children}</MemberShell>
    </ChromeProvider>
  );
}
