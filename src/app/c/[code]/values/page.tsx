// 가치 카드 짧은 공유 경로(ADR-121 · v3 §10-b). 갈무리 QR 경로(`/c/[code]/[session]`, ADR-80)와 동형.
//   UUID 경로는 카톡으로 뿌릴 수도 구두로 안내할 수도 없다. 코드로 차수를 풀어 UUID 경로로 넘긴다.
//   정적 세그먼트 `values` 가 형제 `[session]` 보다 우선하므로 충돌하지 않는다.
//
// **비멤버 처리가 두 갈래다 — 이 갈림이 이 파일의 핵심이다.**
//   ① 인도자 차수 코드: 비멤버는 **정지**시킨다. 링크가 카톡으로 옮겨 다니므로 자기등록 표면을 열지 않는다
//      (ADR-89 — "링크만 있으면 누구나 실명제 차수에 자기등록"). 늦게 합류하는 사람은 인도자가 등록한다.
//   ② general(체험) 코드: 자기등록이 **목적**이다(`/join` 의 '체험 시작하기'와 같은 자리). 그래서 가입시킨다.
//      결과의 열람 범위도 다르다 — 체험 차수는 coach_id 가 운영자라 `본인 + 운영자`만 본다(ADR-63 전제).
//   분기 조건을 GENERAL_CODE 로 못 박는다. 그러지 않으면 이 관문이 ①이 막으려던 구멍이 된다.
import { redirect } from 'next/navigation';
import { GENERAL_CODE } from '@/app/_screens/entry/general';
import { createServerContext } from '@/core/supabase/server';
import { SHORTCUT } from '@/instruments/futurenow/values/copy';

export const dynamic = 'force-dynamic';

function Notice({ lines }: { lines: string[] }) {
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
      {lines.map((l, i) => (
        <p key={l} className={i === 0 ? 't-body' : 't-caption'}
           style={{ color: i === 0 ? 'var(--color-text)' : 'var(--color-text-secondary)', margin: i === 0 ? 0 : 'var(--space-2) 0 0' }}>
          {l}
        </p>
      ))}
      <a className="ui-btn ui-btn--ghost" href="/home"
         style={{ textDecoration: 'none', marginTop: 'var(--space-4)', display: 'inline-block' }}>{SHORTCUT.home}</a>
    </div>
  );
}

export default async function ValuesShortcutPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const self = `/c/${code}/values`;

  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect(`/login?returnTo=${encodeURIComponent(self)}`);

  const cohort = await ctx.resolveCohortByCode(code).catch(() => null);
  if (!cohort) return <Notice lines={[SHORTCUT.notFound]} />;

  const mine = await ctx.listMyCohorts();
  if (!mine.some((c) => c.cohortId === cohort.id)) {
    // ② general 만 자기등록을 허용한다.
    if (code.toUpperCase() !== GENERAL_CODE) {
      return <Notice lines={[SHORTCUT.notMember(cohort.name), SHORTCUT.askCoach]} />;
    }
    await ctx.enrollByCode(code);
  }

  redirect(`/my/cohorts/${cohort.id}/values`);
}
