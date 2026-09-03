'use client';
// 로그아웃 버튼(멤버 셸 — Step 1.1). signOut → 현관(/). 네이비 헤더 위라 텍스트는 on-accent(밝게).
// 브라우저 Supabase 는 클릭 시 지연 생성(정적 인라인 규약; 렌더 시점 부수효과·throw 회피).
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/core/supabase/client';

/**
 * `variant`
 * - `icon`(기본) — 네이비 제목바 위. 흰 테두리·흰 아이콘.
 * - `sheet` — **흰 시트 안**. 아이콘 그대로 두면 **흰 바탕에 흰 아이콘**이라 안 보인다
 *   (배포해서 눈으로 잡았다 — DOM 에는 있는데 화면에 없었다). 시트에서는 **글자**로 그린다.
 */
export function LogoutButton({ variant = 'icon' }: { variant?: 'icon' | 'sheet' } = {}) {
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

  if (variant === 'sheet') {
    return (
      <button type="button" onClick={logout} disabled={busy} className="site-sheet__logout" style={{ opacity: busy ? 0.6 : 1 }}>
        {failed ? '로그아웃 다시 시도' : '로그아웃'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      aria-label={failed ? '로그아웃 다시 시도' : '로그아웃'}
      title={failed ? '다시 시도' : '로그아웃'}
      style={{
        width: 'var(--tap-min)',
        height: 'var(--tap-min)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius)',
        border: `1px solid ${failed ? 'var(--color-danger)' : 'var(--color-text-on-accent)'}`,
        background: 'transparent',
        color: failed ? 'var(--color-danger)' : 'var(--color-text-on-accent)',
        cursor: 'pointer',
        opacity: busy ? 0.6 : 1,
      }}
    >
      {/* 나가기(로그아웃) 아이콘 */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    </button>
  );
}
