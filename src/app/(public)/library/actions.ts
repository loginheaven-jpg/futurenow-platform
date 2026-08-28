'use server';
// 서명 URL 발급 — **자격 판정은 코어가 `library_can_read` 로 한다**(목록 RLS 와 같은 표).
//   여기서 role 을 다시 보지 않는다. 판정이 두 곳이 되면 한 곳만 고쳐질 때 뚫린다.
import { createServerContext } from '@/core/supabase/server';

export async function signLibraryFileAction(storagePath: string): Promise<{ url: string | null }> {
  try {
    const ctx = await createServerContext();
    // 만료 5분 — 링크가 카톡으로 옮겨 다녀도 오래 살지 않게 한다.
    const url = await ctx.signLibraryFile(storagePath, 300);
    return { url };
  } catch {
    return { url: null };
  }
}
