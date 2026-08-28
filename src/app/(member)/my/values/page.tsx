// 가치 카드 — **개인 응시**(차수 미소속 · S-2 · ADR-122).
//
// 차수 경로(`/my/cohorts/[cohortId]/values`)와 **같은 컴포넌트를 쓴다.** 화면을 복제하지 않는다
//   (발주서 §3.2). 두 라우트 파일이 다른 것은 **`cohortId` 를 어떻게 해석하는가** 하나뿐이다.
//     차수 경로 — URL 의 cohortId 를 자기 차수 목록과 대조해 통과시킨다
//     이 경로   — cohortId 가 **없다**(null). 대신 응시 자격을 본다
//
// **게이트 두 겹.** ① `/my` 는 PROTECTED_PREFIXES 라 미인증이 미들웨어에서 /login 으로 걸린다.
//   ② 그것은 *인증*만 본다. **응시 자격**은 여기서 본다 — 자격이 없으면 `/pending` 으로 받는다.
//   화면이 막는 것은 표시일 뿐이고 진짜 강제는 `value_save_progress` 안의 `member_can_assess` 다.
//   그 둘이 갈리지 않는 이유는 같은 판정(`member_state`)을 보기 때문이다.
//
// **게이트를 데이터보다 먼저** 통과시킨다(CLAUDE §9) — 자격 판정 뒤에야 응시 데이터를 읽는다.
import { redirect } from 'next/navigation';
import { createServerContext } from '@/core/supabase/server';
import { VALUE_TOOL } from '@/instruments/futurenow/values/copy';
import { ValuesClient } from '@/app/(member)/my/cohorts/[cohortId]/values/ValuesClient';

export const dynamic = 'force-dynamic';

export default async function PersonalValuesPage() {
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');

  // **화면 게이트를 걷었다**(최박사 확정 2026-08-30 · 진단 홈과 같은 근거).
  //   여기서 튕기면 종료된 회기 참여자가 **자기 상시 검사 결과를 볼 길이 없다** —
  //   상시분(`cohort_id = NULL`)은 회기 경로로 갈 수 없기 때문이다.
  //   신규 시작은 `value_save_progress`·`value_finalize` 안의 게이트가 막는다.

  const initial = await ctx.getMyValueAssessment(null);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* **헤더는 껍데기가 그린다**(U-2 · §12.3 규칙 1). 제목·뒤로는 `_lib/screenChrome` 표가 든다 —
          제목은 라우트의 성질이지 화면의 사정이 아니다. */}
      {/* 열람 고지(IA §4.2 ①) — 허락을 구하는 문장이 아니라 알려 주는 문장이다.
          차수 경로는 "우리 기수 인도자와 함께 봅니다", 개인 경로는 이것이다. */}
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-3)' }}>
        이 결과는 나만 봅니다.
      </p>
      <ValuesClient cohortId={null} initial={initial} />
    </div>
  );
}
