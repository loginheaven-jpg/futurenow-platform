'use server';
// 차수 관리(마감·정원·이름·복구) — 기존 updateCohort 위 배선. 계약 변경 0. 권한은 앱 게이트 + cohorts_update RLS 이중.
import { createServerContext } from '@/core/supabase/server';
import { cohortNameValid } from './cohortAdmin';

async function ctx() {
  return await createServerContext();
}

export async function archiveCohortAction(cohortId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await (await ctx()).updateCohort(cohortId, { status: 'archived' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '마감에 실패했습니다.' };
  }
}

export async function setCohortCapAction(cohortId: string, maxMembers: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await (await ctx()).updateCohort(cohortId, { maxMembers });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '정원 변경에 실패했습니다.' };
  }
}

// 이름 수정 — updateCohort({ name }) 경유. 검증(1~40자) 1차(액션)·2차(UI 저장 비활성).
export async function renameCohortAction(cohortId: string, name: string): Promise<{ ok: boolean; error?: string }> {
  if (!cohortNameValid(name)) return { ok: false, error: '이름은 1~40자로 입력해 주세요.' };
  try {
    await (await ctx()).updateCohort(cohortId, { name: name.trim() });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '이름 변경에 실패했습니다.' };
  }
}

// 소개 수정 — updateCohort({ description }) 경유. 빈 값=null(소개 지움). 권한은 앱 게이트 + cohorts_update RLS(소유) 이중.
export async function setCohortDescriptionAction(cohortId: string, description: string | null): Promise<{ ok: boolean; error?: string }> {
  try {
    await (await ctx()).updateCohort(cohortId, { description });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '소개 저장에 실패했습니다.' };
  }
}

// 마감 복구(비파괴) — updateCohort({ status: 'active' }) 경유. 2단계 확인 불필요(즉시).
export async function reopenCohortAction(cohortId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await (await ctx()).updateCohort(cohortId, { status: 'active' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '다시 열기에 실패했습니다.' };
  }
}

// 사후 진단 개시 — open_post_wave RPC 경유(코치 자기 차수·NULL→now() 멱등). 권한은 RPC 내부 게이트. ADR-55
export async function openPostWaveAction(cohortId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await (await ctx()).openPostWave(cohortId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '사후 진단 개시에 실패했습니다.' };
  }
}
