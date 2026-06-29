'use client';
// 본부 멤버 관리 클라이언트 래퍼 — 승격/강등 액션 + 갱신. 데이터는 서버 컴포넌트가 주입.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MemberSummary } from '@/contracts';
import { AdminMembers } from './AdminMembers';
import { setUserRoleAction } from './actions';

export function AdminClient({ members, currentUserId }: { members: MemberSummary[]; currentUserId: string }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function change(userId: string, role: 'coach' | 'user') {
    setBusyId(userId);
    try {
      await setUserRoleAction(userId, role);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminMembers
      members={members}
      currentUserId={currentUserId}
      busyId={busyId}
      onPromote={(id) => change(id, 'coach')}
      onDemote={(id) => change(id, 'user')}
    />
  );
}
