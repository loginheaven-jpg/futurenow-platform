'use client';
// §8.3 차수 상세 클라이언트 래퍼 — 라우팅·관리 액션 배선 + 결과 토스트(2.4 패턴). 데이터는 서버 컴포넌트가 주입.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CohortDetail } from '@/app/_screens/console/CohortDetail';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { useToast } from '@/app/_toast/ToastProvider';
import type { CohortSummary, RosterMember } from '@/app/_screens/types';
import { archiveCohortAction, deleteCohortAction, openPostWaveAction, renameCohortAction, reopenCohortAction, setCohortCapAction, setCohortDescriptionAction } from './actions';
import { applyOptimistic, refineActionError } from './cohortAdmin';

export function CohortDetailClient({
  summary,
  roster,
  status,
  maxMembers,
  postOpened,
  backHref,
  isAdmin,
  memberCount,
  responseCount,
}: {
  summary: CohortSummary;
  roster: RosterMember[];
  status: 'active' | 'archived';
  maxMembers: number;
  postOpened: boolean; // 사후 진단 개시 여부(cohort.post_opened_at != null). ADR-55
  backHref: string; // 진입 출처 기반(A′-4) — 서버가 ?from= 로 산출(콘솔/목록)
  isAdmin: boolean; // 운영자면 데이터 있는 차수도 삭제 가능(코치는 빈 차수만). ADR-67
  memberCount: number; // 참여 수(삭제 가능 판정·컨펌 영향 표시)
  responseCount: number; // 응답 수(동)
}) {
  const router = useRouter();
  const toast = useToast();

  // 낙관적 이름(C-4 시범·ADR-62): 서버 truth(summary.name) 위에 얹는 낙관적 오버레이(null=오버레이 없음).
  // 이름 변경은 저위험(자기 소유 설정·완전 가역)이고 서버가 입력(name.trim())을 그대로 저장 → 낙관적 값 == 서버 값(드리프트 0).
  const [optimisticName, setOptimisticName] = useState<string | null>(null);
  const effectiveName = optimisticName ?? summary.name;

  // 관리 액션 공통 처리: 성공 → 토스트 + refresh, 실패 → 정제 토스트(원본 비노출). (이름 제외 5개 — 아직 전체 재렌더)
  async function run(action: () => Promise<{ ok: boolean; error?: string }>, successMsg: string) {
    const res = await action();
    if (res.ok) {
      toast.success(successMsg);
      router.refresh();
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

  // 차수 삭제(파괴적·ADR-67) — 성공 시 차수 소멸이라 refresh 대신 목록으로 이동 + 토스트. 실패 시 정제 토스트(예약/데이터 가드 메시지 노출).
  async function onDelete() {
    const res = await deleteCohortAction(summary.id);
    if (res.ok) {
      toast.success('차수를 삭제했어요.');
      router.push(backHref);
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
        headerActions={<HeaderActions />}
        backHref={backHref}
        isAdmin={isAdmin}
        memberCount={memberCount}
        responseCount={responseCount}
        onGroupReport={() => router.push(`/coach/cohort/${summary.id}/group`)}
        onOpenMember={(responseId) => router.push(`/coach/cohort/${summary.id}/report/${responseId}`)}
        onArchive={() => run(() => archiveCohortAction(summary.id), '차수를 마감했어요.')}
        onSetCap={(n) => run(() => setCohortCapAction(summary.id, n), '정원을 바꿨어요.')}
        onRename={renameOptimistic}
        onSetDescription={(description) => run(() => setCohortDescriptionAction(summary.id, description), '소개를 저장했어요.')}
        onReopen={() => run(() => reopenCohortAction(summary.id), '차수를 다시 열었어요.')}
        onOpenPost={() => run(() => openPostWaveAction(summary.id), '사후 진단을 개시했어요.')}
        onDelete={onDelete}
      />
    </div>
  );
}
