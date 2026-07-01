'use client';
// 본부 멤버 관리 클라이언트 래퍼 — 승격/강등 액션 + 갱신. 데이터는 서버 컴포넌트가 주입.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MemberSummary } from '@/contracts';
import { useToast } from '@/app/_toast/ToastProvider';
import { HeaderActions } from '@/app/_screens/HeaderActions';
import { AdminMembers } from './AdminMembers';
import { setUserRoleAction } from './actions';

export function AdminClient({ members, currentUserId }: { members: MemberSummary[]; currentUserId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function change(userId: string, role: 'coach' | 'user') {
    setBusyId(userId);
    try {
      const res = await setUserRoleAction(userId, role);
      if (res.ok) {
        toast.success(role === 'coach' ? '코치로 승격했어요.' : '멤버로 되돌렸어요.');
        router.refresh();
      } else {
        // 친화 고정 메시지(액션 raw 사유 비노출 — setUserRole 정제는 후속 범위).
        toast.error('역할 변경에 실패했어요.');
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminMembers
      members={members}
      currentUserId={currentUserId}
      busyId={busyId}
      headerActions={<HeaderActions homeHref="/admin" navHref="/coach" navLabel="코치 콘솔" />}
      onPromote={(id) => change(id, 'coach')}
      onDemote={(id) => change(id, 'user')}
    />
  );
}
