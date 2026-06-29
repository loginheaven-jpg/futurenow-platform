'use client';
// 로그아웃 버튼(멤버 셸 — Step 1.1). signOut → 현관(/). 네이비 헤더 위라 텍스트는 on-accent(밝게).
// 브라우저 Supabase 는 클릭 시 지연 생성(정적 인라인 규약; 렌더 시점 부수효과·throw 회피).
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/core/supabase/client';

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function logout() {
    setBusy(true);
    setFailed(false);
    try {
      await createBrowserSupabase().auth.signOut();
      router.push('/'); // 성공 시에만 이동(컴포넌트 언마운트)
      router.refresh();
    } catch {
      // 실패는 조용히 성공으로 처리하지 않는다 — 재시도 가능 상태로 표시.
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="t-caption"
      style={{
        minHeight: 'var(--tap-min)',
        padding: '0 var(--space-3)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-text-on-accent)',
        background: 'transparent',
        color: 'var(--color-text-on-accent)',
        cursor: 'pointer',
        opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? '나가는 중…' : failed ? '다시 시도' : '로그아웃'}
    </button>
  );
}
