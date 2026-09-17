'use server';
// 회차 갈무리 카드 서버 액션(ADR-80). 코어 경유 — 쓰기는 전량 DEFINER RPC(checkin_*). 권한·게이트는 RPC 내부.
import type { CheckinPhoto } from '@/contracts';
import { createServerContext } from '@/core/supabase/server';

type Flags = { suggestionAnon?: boolean; contactRequest?: boolean; deepOpened?: boolean; stepPrivate?: boolean };

// 자동 저장(upsert). has_content 는 서버(checkin_save)가 계산.
export async function saveCheckinAction(
  cohortId: string,
  sessionNo: number,
  answers: Record<string, unknown>,
  flags?: Flags,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await createServerContext();
    await ctx.saveMyCheckin({ cohortId, sessionNo, answers, flags });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '저장에 실패했습니다.' };
  }
}

// 제출 — 반드시 save 선행(행 존재 전제). 최초 submitted_at 고정, 재제출 edit_count+1.
export async function submitCheckinAction(
  cohortId: string,
  sessionNo: number,
  answers: Record<string, unknown>,
  flags?: Flags,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await createServerContext();
    await ctx.saveMyCheckin({ cohortId, sessionNo, answers, flags }); // R2: save → submit 순서 보장
    await ctx.submitMyCheckin(cohortId, sessionNo);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '제출에 실패했습니다.' };
  }
}

// 카드 최초 진입 표식(first_opened_at 1회). 실패는 무해(계측만) — 조용히 삼킨다.
export async function markCheckinOpenedAction(cohortId: string, sessionNo: number): Promise<void> {
  try {
    const ctx = await createServerContext();
    await ctx.markCheckinOpened(cohortId, sessionNo);
  } catch {
    /* 계측 실패 무해 */
  }
}

// ── 워크북 사진(ADR-197) — 목록·삭제·「인도자 열람」. 올리기 바이트는 브라우저가 저장소로 직접 보낸다. ──
// 목록 — 올린 뒤 새 signed URL 을 받는다(서버가 서명한다 · 브라우저 supabase 재구현 없음).
export async function listMyCheckinPhotosAction(
  cohortId: string,
  sessionNo: number,
): Promise<{ ok: true; photos: CheckinPhoto[] } | { ok: false }> {
  try {
    const ctx = await createServerContext();
    const me = await ctx.currentUser();
    if (!me) return { ok: false };
    return { ok: true, photos: await ctx.listCheckinPhotos(cohortId, sessionNo, me.id) };
  } catch {
    return { ok: false };
  }
}

// 삭제 — **본인 경로만**(경로 [2] = 본인). 운영자 삭제는 인도자 화면의 별도 액션이다.
//   저장소 정책이 한 번 더 막는다 — 이 확인은 참여자 화면이 남의 경로를 지우는 통로가 되지 않게 하는 것이다.
export async function deleteMyCheckinPhotoAction(path: string): Promise<{ ok: boolean }> {
  try {
    const ctx = await createServerContext();
    const me = await ctx.currentUser();
    if (!me || path.split('/')[1] !== me.id) return { ok: false };
    await ctx.deleteCheckinPhoto(path);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// 「인도자 열람」 — 본인 것만 쓴다(checkin_photo_prefs_set 이 auth.uid() 로만 쓴다).
export async function setCheckinPhotoCoachViewAction(sessionNo: number, coachView: boolean): Promise<{ ok: boolean }> {
  try {
    const ctx = await createServerContext();
    await ctx.setMyCheckinPhotoCoachView(sessionNo, coachView);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
