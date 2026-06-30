// 중간저장 보조 — 재개 위치 계산(순수) + localStorage 자동 보존(투명·기기 로컬).
// step 은 저장하지 않는다(블록 내 item 은 세션마다 셔플 — applyOrdering). 블록 ORDER 는 불변이라
// "안 푼 첫 필수 item 이 든 블록 인덱스"는 셔플과 무관하게 안정 → answers 만으로 위치 재계산.
import type { AnswerValue, Block, StandardBlock, Wave } from '@/contracts';

const isAnswered = (v: AnswerValue | undefined): boolean => v !== undefined && v !== null && v !== '';
const blockItems = (b: Block) => (b.kind === 'standard' ? (b as StandardBlock).items : []);

// 재개 step — 안 푼 첫 필수 문항이 든 블록. 다 풀었으면 마지막 블록(제출 도달). 빈 schema 면 0.
export function draftLocation(blocks: Block[], answers: Record<string, AnswerValue>): number {
  for (let i = 0; i < blocks.length; i += 1) {
    if (blockItems(blocks[i]).some((it) => it.required && !isAnswered(answers[it.code]))) return i;
  }
  return Math.max(0, blocks.length - 1);
}

// answers 에 의미 있는 응답이 하나라도 있나(빈 draft 복원 스킵용).
export function hasAnyAnswer(answers: Record<string, AnswerValue> | null | undefined): boolean {
  return !!answers && Object.values(answers).some(isAnswered);
}

// ── localStorage(자동·투명) ── 서버 draft([중간저장] 버튼)와 별개. cohortId 없으면(미리보기) 미사용.
const localKey = (cohortId: string, wave: Wave) => `fn-draft:${cohortId}:${wave}`;

export function readLocalDraft(cohortId: string, wave: Wave): Record<string, AnswerValue> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(localKey(cohortId, wave));
    return raw ? (JSON.parse(raw) as Record<string, AnswerValue>) : null;
  } catch {
    return null; // 파싱/접근 실패는 조용히 무시(자동 저장은 투명·비차단)
  }
}

export function writeLocalDraft(cohortId: string, wave: Wave, answers: Record<string, AnswerValue>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(localKey(cohortId, wave), JSON.stringify(answers));
  } catch {
    /* 용량 초과 등은 무시(자동 저장은 best-effort) */
  }
}

export function clearLocalDraft(cohortId: string, wave: Wave): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(localKey(cohortId, wave));
  } catch {
    /* 무시 */
  }
}
