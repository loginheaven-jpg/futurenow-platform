// 통합 홈 본문(프레젠테이션 — 부수효과 없음).
//
// ★ **ADR-181 로 얇아졌다.** 남은 것은 **인사말 + 진행 중 진단** 둘뿐이다 —
//   운영 카드는 역할 카드와 **같은 목적지를 두 번 말하고 있어** 걷었고(승인 대기 건수는 역할 카드로 옮겼다),
//   내 활동·코드 참여는 **시트로** 갔다(지시: 메뉴는 햄버거 휘하).
// 데이터 = listMyCohorts(my_cohorts RPC). pre_done=false = 진행 중 진단(가입했으나 사전 미완). 참여자 팔레트·의미색 0(§0.4).
// role: 코치·운영자에게만 '운영' 카드(→/coach·/admin) 노출(A′-1 역할 감금 해제 — 홈은 전원 개방·카드는 자격자만).
import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { MyCohortSummary } from '@/contracts';
import { TOOL } from '@/app/_vocab/tool';
import { POST_OPEN_HEAD, postJoinHref, postOpenBody } from '@/app/_vocab/postNudge';

const cta: CSSProperties = { width: '100%', textDecoration: 'none' };

// ★ `ActivityRow`·`rowBase` 를 걷었다(ADR-181) — 「내 활동」 두 줄이 시트로 갔고 쓰는 곳이 0이 됐다.
//   **쓰지 않는 부품을 남겨 두지 않는다** — 다음 사람이 «어디에 쓰이나» 를 찾느라 시간을 쓴다.

export function MemberHome({ greetingName, cohorts }: { greetingName: string; cohorts: MyCohortSummary[] }) {
  // 진행 중 진단: pre_done=false 중 가장 최근 가입(joinedAt desc) 1건
  const inProgress = [...cohorts].filter((c) => !c.preDone).sort((a, b) => b.joinedAt.localeCompare(a.joinedAt))[0] ?? null;
  // 사후 진단하기: 사후 개시·미완(post_opened && !post_done). 사전 미완이면 위 pre 카드가 우선(B-2).
  const postPending = [...cohorts].filter((c) => c.postOpened && !c.postDone).sort((a, b) => b.joinedAt.localeCompare(a.joinedAt))[0] ?? null;

  return (
    <div>
      <p className="t-body-lg" style={{ color: 'var(--color-text)', margin: '0 0 var(--space-6)' }}>
        {greetingName}님, 반가워요.
      </p>

      {/* ★ **운영 구획을 걷었다**(ADR-181). 바로 위 역할 카드가 `/coach`·`/admin` 을 이미 든다 —
          같은 목적지를 한 화면에서 두 번 말하고 있었다(실측 · 문안만 달랐다).
          **승인 대기 건수는 잃지 않았다** — 역할 카드의 곁말로 옮겼다(`roleTargets`). */}

      {/* 진행 중 진단 — 조건부 최상단(골드 틴트 블록). 사전 미완 우선, 없으면 사후 개시·미완(B-2). */}
      {inProgress ? (
        <section style={{ background: 'var(--color-accent-soft)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
          <p className="t-caption" style={{ color: 'var(--color-primary)', fontWeight: 600, margin: '0 0 var(--space-1)' }}>진행 중인 {TOOL.short}</p>
          <p className="t-body" style={{ color: 'var(--color-text)', margin: '0 0 var(--space-4)' }}>
            {inProgress.name} · {TOOL.pre}를 아직 마치지 않았어요.
          </p>
          <Link className="ui-btn" href={`/join?cohort=${inProgress.cohortId}`} style={{ ...cta, background: 'var(--color-accent)', color: 'var(--color-text-on-gold)' }}>
            이어서 {TOOL.short}하기
          </Link>
        </section>
      ) : postPending ? (
        <section style={{ background: 'var(--color-accent-soft)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
          <p className="t-caption" style={{ color: 'var(--color-primary)', fontWeight: 600, margin: '0 0 var(--space-1)' }}>{POST_OPEN_HEAD}</p>
          <p className="t-body" style={{ color: 'var(--color-text)', margin: '0 0 var(--space-4)' }}>
            {postOpenBody(postPending.name)}
          </p>
          <Link className="ui-btn" href={postJoinHref(postPending.cohortId)} style={{ ...cta, background: 'var(--color-accent)', color: 'var(--color-text-on-gold)' }}>
            {TOOL.post} 하기
          </Link>
        </section>
      ) : null}

      {/* ★ **내 활동 셋을 시트로 옮겼다**(ADR-181 · 지시 「메뉴들은 햄버거버튼 휘하에 있다」).
          「내 세미나」·「내 리포트」·「코드로 세미나 참여」가 그것이고 **이름은 그대로**다
          (`_vocab/memberMenu`). 옮기면서 이름을 바꾸면 쓰던 사람이 같은 문을 못 알아본다.

          ★ **표기 오류 하나가 함께 사라졌다.** 「참여 중 {total} · 완료 {done}」에서
          `total` 은 보관 포함 전체였고 `done` 은 **사전 진단 완료**였다 — 회기 하나짜리 사람이
          「참여 중 1 · 완료 1」로 보였다(**같은 회기를 두 번 셈**). 시트는 수를 세지 않는다. */}
    </div>
  );
}
