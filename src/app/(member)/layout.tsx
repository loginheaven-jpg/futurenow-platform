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
import { createServerContext } from '@/core/supabase/server';
import { CONSENT_VERSION } from '@/app/_consent/consent';
import { buildMemberSheet } from '@/app/_lib/memberSheet';
import { MemberShell } from '@/app/_screens/shell/MemberShell';
import { COHORT_ROLE_LABEL } from '@/core/membershipVocab';

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');

  // **판정만 하고 화면을 바꾸지 않는다.** 어떤 화면을 그릴지는 여전히 `/home` 이 정한다 —
  //   여기서 `ConsentGate` 를 그리면 그 결정이 두 곳에 살게 된다(불변식 23).
  const consents = await ctx.listMyConsents().catch(() => []);
  const consented = consents.some((c) => c.type === 'privacy_use' && c.version === CONSENT_VERSION);
  if (!consented) return <>{children}</>;

  const cohorts = await ctx.listMyCohorts().catch(() => []);
  const active = cohorts.filter((c) => c.status === 'active');
  // eslint-disable-next-line react-hooks/purity
  const sheetData = await buildMemberSheet(ctx, cohorts, { hasFeed: active.length > 0, now: Date.now() })
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

  return <MemberShell sheet={sheet}>{children}</MemberShell>;
}
