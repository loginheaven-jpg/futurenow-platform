'use server';
// 서가 서버 동작 — **판정은 전부 DB 가 한다.** 여기서 role 이나 등급을 다시 보지 않는다.
//   판정이 두 곳이 되면 한 곳만 고쳐질 때 뚫린다(옛 `signLibraryFileAction` 머리의 그 문장 그대로다).
//
// **주소를 돌려주는 동작이 없다**(§4). 파일은 `/library/[id]/file` 프록시가 흘리고,
//   그 라우트조차 클라이언트에게 저장소 주소를 주지 않는다.
import { createServerContext } from '@/core/supabase/server';
import type { LibraryAddInput } from '@/contracts/domain';

/** 파일을 저장소에 올린다. **자기 폴더에만** 쓰인다 — 저장소 정책이 그것을 강제한다. */
export async function uploadLibraryFileAction(
  form: FormData,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: '파일을 고르지 못했습니다.' };
  try {
    const ctx = await createServerContext();
    const me = await ctx.currentUser();
    if (!me) return { ok: false, error: '로그인이 필요합니다.' };
    // 경로 관용구는 피드·갈무리 사진과 같다(`{uid}/…`) — 새 관용구를 만들지 않는다.
    //   이름은 서버가 짓는다. 사용자가 준 이름을 그대로 쓰면 경로가 예측 가능해진다.
    const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).slice(0, 10) : '';
    const path = `${me.id}/${crypto.randomUUID()}${ext}`;
    const ok = await ctx.uploadLibraryFile(path, file);
    if (!ok) return { ok: false, error: '지금은 올릴 수 없습니다. 잠시 뒤 다시 시도해 주세요.' };
    return { ok: true, path };
  } catch {
    return { ok: false, error: '지금은 올릴 수 없습니다. 잠시 뒤 다시 시도해 주세요.' };
  }
}

export async function addLibraryItemAction(
  input: LibraryAddInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const ctx = await createServerContext();
    const id = await ctx.addLibraryItem(input);
    return { ok: true, id };
  } catch {
    // 자격 없음(42501)도 여기로 온다 — 화면은 하나의 문장으로 받는다.
    return { ok: false, error: '지금은 올릴 수 없습니다. 자격을 확인해 주세요.' };
  }
}

export async function hideLibraryItemAction(
  id: string, hidden: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const ctx = await createServerContext();
    await ctx.hideLibraryItem(id, hidden);
    return { ok: true };
  } catch {
    return { ok: false, error: '지금은 바꿀 수 없습니다.' };
  }
}
