'use client';
// §8.3 회기 상세 클라이언트 래퍼 — 라우팅·관리 액션 배선 + 결과 토스트(2.4 패턴). 데이터는 서버 컴포넌트가 주입.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/core/ui';
import { CohortDetail } from '@/app/_screens/console/CohortDetail';
import { useToast } from '@/app/_toast/ToastProvider';
import type { CohortSummary, RosterMember } from '@/app/_screens/types';
import { archiveCohortAction, deleteCohortAction, moveMemberAction, openPostWaveAction, removeCohortMemberAction, renameCohortAction, reopenCohortAction, setCohortCapAction, setCohortDescriptionAction } from './actions';
import { applyOptimistic, refineActionError } from './cohortAdmin';

type MoveTarget = { id: string; name: string };

// 운영자 참여자 이동 행 — 이름 + 대상 선택 + [이동]. 대상=다른 회기/미배정(체험)/휴지통(삭제).
function MoveRow({ member, targets, onMove }: { member: RosterMember; targets: MoveTarget[]; onMove: (userId: string, name: string, toId: string, toName: string) => Promise<void> }) {
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const name = member.name ?? '참여자';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <span className="t-body" style={{ flex: 1, minWidth: 0, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      <select
        value={to}
        onChange={(e) => setTo(e.target.value)}
        aria-label={`${name} 이동 대상`}
        style={{ minHeight: 'var(--tap-min)', borderRadius: 'var(--radius)', border: 'var(--border-hair) solid var(--color-border)', background: 'var(--color-surface-1)', color: 'var(--color-text)', font: 'inherit', fontSize: 13, maxWidth: 150 }}
      >
        <option value="">이동 대상…</option>
        {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <Button
        variant="ghost"
        disabled={!to || busy}
        onClick={async () => {
          const t = targets.find((x) => x.id === to);
          if (!t) return;
          setBusy(true);
          await onMove(member.userId, name, t.id, t.name);
          setBusy(false);
          setTo('');
        }}
      >
        {busy ? '이동 중…' : '이동'}
      </Button>
    </div>
  );
}

export function CohortDetailClient({
  summary,
  roster,
  status,
  maxMembers,
  postOpened,
  postStatus,
  backHref,
  isAdmin,
  canManageMembers,
  memberCount,
  responseCount,
  moveTargets,
}: {
  summary: CohortSummary;
  roster: RosterMember[];
  status: 'active' | 'archived';
  maxMembers: number;
  postOpened: boolean; // 사후 진단 개시 여부(cohort.post_opened_at != null). ADR-55
  /** 마무리 체크 진행(U-8) — 서버가 `responses` 를 wave 로 갈라 센다. 추가 조회 0. */
  postStatus: { done: number; total: number; pending: string[] };
  backHref: string; // 진입 출처 기반(A′-4) — 서버가 ?from= 로 산출(콘솔/목록)
  isAdmin: boolean; // 운영자면 데이터 있는 회기도 삭제 가능(코치는 빈 회기만). ADR-67
  canManageMembers: boolean; // 참여자 휴지통 노출 — 해당 회기 코치 또는 운영자만(서버 판정). ADR-73
  memberCount: number; // 참여 수(삭제 가능 판정·컨펌 영향 표시)
  responseCount: number; // 응답 수(동)
  moveTargets: MoveTarget[]; // 운영자 이동 대상(같은 진단 회기 + 미배정/휴지통, 현재 회기 제외). 비운영자는 빈 배열. ADR-84
}) {
  const router = useRouter();
  const toast = useToast();

  // 낙관적 이름(C-4 시범·ADR-62): 서버 truth(summary.name) 위에 얹는 낙관적 오버레이(null=오버레이 없음).
  // 이름 변경은 저위험(자기 소유 설정·완전 가역)이고 서버가 입력(name.trim())을 그대로 저장 → 낙관적 값 == 서버 값(드리프트 0).
  const [optimisticName, setOptimisticName] = useState<string | null>(null);
  const effectiveName = optimisticName ?? summary.name;

  // 관리 액션 공통 처리: 성공 → 토스트 + refresh, 실패 → 정제 토스트(원본 비노출). (이름 제외 5개 — 아직 전체 재렌더)
  //
  // pending 이 필요한 이유(성능 감사 2026-08-25): 액션이 끝나고 router.refresh() 가 도는 동안
  //   버튼이 살아 있어 같은 액션이 두 번 발화할 수 있었다. useTransition 은 refresh() 의 재렌더까지
  //   pending 에 포함하므로, '눌렀는데 아무 일도 없다'는 구간 전체를 덮는다.
  //   문구를 새로 만들지 않는다(§2-1) — 비활성화로만 알린다.
  const [pending, startTransition] = useTransition();
  async function run(action: () => Promise<{ ok: boolean; error?: string }>, successMsg: string) {
    if (pending) return; // 연타 차단 — 첫 클릭이 끝나기 전에는 두 번째를 받지 않는다
    const res = await action();
    if (res.ok) {
      toast.success(successMsg);
      startTransition(() => router.refresh());
    } else {
      toast.error(refineActionError(res.error));
    }
  }

  // 이름 변경 — router.refresh() 전체 재렌더(바닥 ~1.5s) 대신 낙관적 즉시 반영. 성공 시 재조회 없음(낙관적 값=서버 값),
  // 실패·예외 시 이전 이름으로 롤백 + 에러 토스트(조용한 삼킴 금지). 편집 버퍼는 화면이 보유 → 실패 시 저장 재활성(재시도).
  async function renameOptimistic(name: string) {
    await applyOptimistic({
      optimistic: () => setOptimisticName(name),
      action: () => renameCohortAction(summary.id, name),
      onCommit: () => toast.success('이름을 바꿨어요.'),
      onRollback: (error) => {
        setOptimisticName(null); // 서버 truth(이전 이름)로 복귀
        toast.error(refineActionError(error));
      },
    });
  }

  // 회기 삭제(파괴적·ADR-67) — 성공 시 회기 소멸이라 refresh 대신 목록으로 이동 + 토스트. 실패 시 정제 토스트(예약/데이터 가드 메시지 노출).
  async function onDelete() {
    const res = await deleteCohortAction(summary.id);
    if (res.ok) {
      toast.success('회기를 삭제했어요.');
      router.push(backHref);
    } else {
      toast.error(refineActionError(res.error));
    }
  }

  // 참여자 제거(휴지통·ADR-73) — 성공 시 refresh(명단에서 사라짐). 컨펌은 RosterRow 가 담당(2단계).
  async function onRemoveMember(userId: string, name: string) {
    const res = await removeCohortMemberAction(summary.id, userId);
    if (res.ok) {
      toast.success(`${name} 님을 회기에서 지웠어요.`);
      router.refresh();
    } else {
      toast.error(refineActionError(res.error));
    }
  }

  // 참여자 이동(운영자·ADR-84) — 등록만 옮김. 성공 시 refresh(명단에서 사라짐).
  async function onMove(userId: string, name: string, toId: string, toName: string) {
    const res = await moveMemberAction(userId, summary.id, toId);
    if (res.ok) {
      toast.success(`${name} 님을 ‘${toName}’(으)로 옮겼어요.`);
      router.refresh();
    } else {
      toast.error(refineActionError(res.error));
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <CohortDetail
        cohort={{ ...summary, name: effectiveName }}
        roster={roster}
        status={status}
        maxMembers={maxMembers}
        postOpened={postOpened}
        postStatus={postStatus}
        backHref={backHref}
        isAdmin={isAdmin}
        canManageMembers={canManageMembers}
        memberCount={memberCount}
        responseCount={responseCount}
        onRemoveMember={onRemoveMember}
        onGroupReport={() => router.push(`/coach/cohort/${summary.id}/group`)}
        onOpenMember={(responseId) => router.push(`/coach/cohort/${summary.id}/report/${responseId}`)}
        actionPending={pending}
        onArchive={() => run(() => archiveCohortAction(summary.id), '회기를 마감했어요.')}
        onSetCap={(n) => run(() => setCohortCapAction(summary.id, n), '정원을 바꿨어요.')}
        onRename={renameOptimistic}
        onSetDescription={(description) => run(() => setCohortDescriptionAction(summary.id, description), '소개를 저장했어요.')}
        onReopen={() => run(() => reopenCohortAction(summary.id), '회기를 다시 열었어요.')}
        onOpenPost={() => run(() => openPostWaveAction(summary.id), '마무리 체크를 개시했어요.')}
        onDelete={onDelete}
      />

      {/* 운영자 참여자 이동(ADR-84) — 다른 회기·미배정(체험)·휴지통(삭제)으로. 응답·갈무리는 원 회기에 남고 통계에서 빠짐. */}
      {isAdmin && moveTargets.length > 0 && roster.length > 0 ? (
        <section style={{ marginTop: 'var(--space-6)' }}>
          <h2 className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 16, margin: '0 0 var(--space-1)' }}>참여자 이동 <span className="t-caption" style={{ color: 'var(--color-text-muted)' }}>· 운영자</span></h2>
          <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
            다른 회기·미배정(체험)·휴지통(삭제)으로 옮깁니다. 응답·갈무리는 원 회기에 남고, 옮기면 이 회기 통계에서 빠집니다. 휴지통에서 다시 옮기면 복원됩니다.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {roster.map((m) => <MoveRow key={m.userId} member={m} targets={moveTargets} onMove={onMove} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
