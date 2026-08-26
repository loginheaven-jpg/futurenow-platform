// 체크 허브 — 여정 계열 · 상시 계열 (S-3 · ADR-122 후속).
//
// **`/home` 아래 두는 이유**(IA v2.1 §2.2): `/assessments` 로 최상위에 두면 `PROTECTED_PREFIXES` 에
//   항목이 하나 늘고 커버리지를 다시 증명해야 한다. 기존 접두사 안이면 자동으로 따라온다 —
//   **불변식 17(matcher 를 좁히지 말 것)을 건드리지 않는 배치다.**
//
// **고지는 동의가 아니다**(IA §4.2 ①). 상시 체크를 시작할 때 열람 범위를 한 줄로 알린다 —
//   허락을 구하는 문장이 아니라 알려 주는 문장이고, **동의 토글을 두지 않는다.**
//   차수 회원과 개인 회원의 문장이 다른 이유는 실제로 보는 사람이 다르기 때문이다.
//
// **참여자 화면 규율**(불변식 9·11 · 발주서 §7.3): 경고색·순위·막대·배지 0. 상태 배지도 두지 않는다.
//   자격이 없어 닫힌 항목은 **색이 아니라 문장**으로 말한다.
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/app/_screens/AppHeader';
import { createServerContext } from '@/core/supabase/server';
import { assessmentAccess } from '@/app/_lib/assessmentAccess';
import { TOOL } from '@/app/_vocab/tool';
import { VALUE_TOOL } from '@/instruments/futurenow/values/copy';

export const dynamic = 'force-dynamic';

const muted = { color: 'var(--color-text-secondary)' } as const;

/** 한 줄 항목. 열려 있으면 링크, 아니면 문장만. **닫힘을 색으로 말하지 않는다.** */
function Item({ title, note, href }: { title: string; note: string; href?: string }) {
  const body = (
    <>
      <span className="t-body">{title}</span>
      <span className="t-caption" style={{ ...muted, display: 'block' }}>{note}</span>
    </>
  );
  return href ? (
    <Link href={href} className="ui-listrow ui-listrow--tappable" style={{ textDecoration: 'none' }}>{body}</Link>
  ) : (
    <div className="ui-listrow">{body}</div>
  );
}

export default async function AssessmentsPage() {
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');

  // 게이트를 데이터보다 먼저(CLAUDE §9). 자격이 없으면 목록을 그리기 전에 대기 안내로 받는다.
  const state = await ctx.getMyMemberState();
  if (!assessmentAccess(state, 'standing') && !assessmentAccess(state, 'journey')) {
    redirect('/pending?returnTo=/home/assessments');
  }

  const cohorts = await ctx.listMyCohorts();
  // 여정은 **활성 차수**에만 붙는다. 마감된 기수는 여정이 끝났고 상시만 남는다.
  const active = cohorts.filter((c) => c.status === 'active');
  const pre = active.find((c) => !c.preDone) ?? null;
  const post = active.find((c) => c.postOpened && !c.postDone) ?? null;

  // 가치 카드는 **소속으로 갈린다** — 차수가 있으면 그 차수 경로, 없으면 개인 경로(S-2).
  //   차수가 여럿이면 첫 활성 차수로 보낸다(차수별 결과가 따로 서므로 임의 선택이 아니라 '지금 그 기수').
  const valueCohort = active[0] ?? null;
  const valueHref = valueCohort ? `/my/cohorts/${valueCohort.cohortId}/values` : '/my/values';
  const canStanding = assessmentAccess(state, 'standing');
  const canJourney = assessmentAccess(state, 'journey');

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="sub" title="체크" homeHref="/home" />

      <h2 className="t-body" style={{ fontWeight: 600, marginTop: 'var(--space-5)' }}>여정</h2>
      <p className="t-caption" style={{ ...muted, marginTop: 'calc(var(--space-1) * -1)' }}>
        기수와 함께 걷는 동안 두 번 합니다.
      </p>
      <div style={{ marginTop: 'var(--space-3)', display: 'grid', gap: 'var(--space-2)' }}>
        <Item
          title={TOOL.pre}
          note={
            !canJourney ? '기수에 속하면 열립니다.'
            : pre ? `${pre.name} — 아직 하지 않으셨어요.`
            : '이미 마치셨어요.'
          }
          href={canJourney && pre ? `/join?cohort=${pre.cohortId}` : undefined}
        />
        <Item
          title={TOOL.post}
          note={
            post ? `${post.name} — 지금 하실 수 있어요.`
            // 자리만(발주서 지시). 아직 열리지 않은 것과 없는 것은 다르므로 **언제 열리는지**를 말한다.
            : '6회차를 마친 뒤 열립니다.'
          }
          href={post ? `/join?cohort=${post.cohortId}&wave=post` : undefined}
        />
      </div>

      <h2 className="t-body" style={{ fontWeight: 600, marginTop: 'var(--space-6)' }}>상시</h2>
      <p className="t-caption" style={{ ...muted, marginTop: 'calc(var(--space-1) * -1)' }}>
        여정과 무관하게 언제든 하실 수 있습니다.
      </p>
      <div style={{ marginTop: 'var(--space-3)', display: 'grid', gap: 'var(--space-2)' }}>
        <Item
          title={VALUE_TOOL}
          note={canStanding ? (valueCohort ? valueCohort.name : '나 혼자 합니다.') : '승인이 끝나면 열립니다.'}
          href={canStanding ? valueHref : undefined}
        />
        {/* 그림자 = SAIL. **연결만 한다** — 스키마·데이터·코드 무접촉(CLAUDE §4 · IA §4.5).
            연결 주소가 저장소 어디에도 없어 링크를 걸지 않았다. 임의로 만들지 않는다(§7.2 보고). */}
        <Item title="그림자" note="곧 이 자리에서 이어집니다." />
        <Item title="사랑의 언어" note="준비하고 있습니다." />
      </div>

      {/* 열람 고지 — 동의가 아니라 알림(IA §4.2 ①). 토글을 두지 않는다.
          그림자 계열에서 이 한 줄의 유무가 응답의 정직함을 가른다. */}
      <p className="t-caption" style={{ ...muted, marginTop: 'var(--space-6)' }}>
        {valueCohort ? '이 결과는 우리 기수 인도자와 함께 봅니다.' : '이 결과는 나만 봅니다.'}
      </p>
    </div>
  );
}
