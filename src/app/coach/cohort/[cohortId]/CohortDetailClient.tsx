'use client';
// §8.3 차수 상세 클라이언트 래퍼 — 라우팅·관리 액션 배선 + 결과 토스트(2.4 패턴). 데이터는 서버 컴포넌트가 주입.
import { useRouter } from 'next/navigation';
import { CohortDetail } from '@/app/_screens/console/CohortDetail';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { useToast } from '@/app/_toast/ToastProvider';
import type { CohortSummary, RosterMember } from '@/app/_screens/types';
import { archiveCohortAction, openPostWaveAction, renameCohortAction, reopenCohortAction, setCohortCapAction, setCohortDescriptionAction } from './actions';
import { refineActionError } from './cohortAdmin';

export function CohortDetailClient({
  summary,
  roster,
  status,
  maxMembers,
  postOpened,
  backHref,
}: {
  summary: CohortSummary;
  roster: RosterMember[];
  status: 'active' | 'archived';
  maxMembers: number;
  postOpened: boolean; // 사후 진단 개시 여부(cohort.post_opened_at != null). ADR-55
  backHref: string; // 진입 출처 기반(A′-4) — 서버가 ?from= 로 산출(콘솔/목록)
}) {
  const router = useRouter();
  const toast = useToast();

  // 네 관리 액션 공통 처리: 성공 → 토스트 + refresh, 실패 → 정제 토스트(원본 비노출).
  async function run(action: () => Promise<{ ok: boolean; error?: string }>, successMsg: string) {
    const res = await action();
    if (res.ok) {
      toast.success(successMsg);
      router.refresh();
    } else {
      toast.error(refineActionError(res.error));
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <CohortDetail
        cohort={summary}
        roster={roster}
        status={status}
        maxMembers={maxMembers}
        postOpened={postOpened}
        headerActions={<HeaderActions />}
        backHref={backHref}
        onGroupReport={() => router.push(`/coach/cohort/${summary.id}/group`)}
        onOpenMember={(responseId) => router.push(`/coach/cohort/${summary.id}/report/${responseId}`)}
        onArchive={() => run(() => archiveCohortAction(summary.id), '차수를 마감했어요.')}
        onSetCap={(n) => run(() => setCohortCapAction(summary.id, n), '정원을 바꿨어요.')}
        onRename={(name) => run(() => renameCohortAction(summary.id, name), '이름을 바꿨어요.')}
        onSetDescription={(description) => run(() => setCohortDescriptionAction(summary.id, description), '소개를 저장했어요.')}
        onReopen={() => run(() => reopenCohortAction(summary.id), '차수를 다시 열었어요.')}
        onOpenPost={() => run(() => openPostWaveAction(summary.id), '사후 진단을 개시했어요.')}
      />
    </div>
  );
}
