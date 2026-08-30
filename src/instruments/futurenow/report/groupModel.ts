// 그룹 리포트 집계(ORDER group_report v2 · 인도자 전용).
//
// **순수 함수만 둔다** — 조회도 렌더도 하지 않는다. 페이지가 이름을 붙여 넘기고,
//   `GroupView` 는 여기서 나온 뷰모델을 **주입받아 그리기만** 한다(발주 §3 공통).
//
// ★ **채점하지 않는다**(경계 2). 모든 값은 이미 계산된 `FuturenowScores` 에서 **파생**한다.
//   새 판정을 만들지 않고 기존 것을 부른다 — `careBanner` · `vitalityZone` · `trap.primary` ·
//   `TRAP_AXES` · `GAP_AXES`. **지어낸 규칙이 하나도 없다.**
import type { FuturenowScores } from '../scoring';
import { careBanner, vitalityZone, VITALITY_ZONES, TRAP_AXES, GAP_AXES, type CareKind } from './labels';

/** 한 사람 — 이름은 **페이지가 조인해서** 넣는다(코어 조회를 컴포넌트가 하지 않는다). */
export type GroupMember = {
  userId: string;
  name: string | null;
  /** 개인 리포트로 가는 응답 id. 링크의 목적지다. */
  responseId: string;
  scores: FuturenowScores;
};

/** 이름이 없을 때 화면이 쓸 말. 한 곳에만 둔다 — 블록마다 다르면 같은 사람이 두 이름으로 보인다. */
export const NO_NAME = '이름 없음';
export const displayName = (m: { name: string | null }): string => m.name ?? NO_NAME;

// ── 블록 0 · 응답 현황 ────────────────────────────────────────────────────────
/**
 * **완료 / 미완료 두 단계다**(ORDER v2 §3 블록 0).
 *
 * ★ 첨부 HTML 은 「작성 중」을 따로 그렸으나 **그 상태를 만들 수 없다** —
 *   `response_drafts` 의 RLS 가 `user_id = auth.uid()` 로 **본인 행만** 허용하고
 *   `getDraft` 시그니처에 `userId` 인자가 없다. 타인 초안을 읽을 경로가 **존재하지 않는다.**
 *   지휘부가 실물로 재검증해 **2단계로 확정**했고, 초안 접근은 **별건으로도 만들지 않는다** —
 *   참여자는 «제출»로 답을 넘기고, 제출 전 초안을 보는 것은 **열람 범위의 성격이 다른 변경**이다.
 *
 * 미완료 = 등록자 − 응답자. 응답이 없는 사람은 이름만 남는다.
 */
export type Attendance = {
  enrolled: number;
  done: GroupMember[];
  /** 아직 응답이 없는 사람. `scores` 가 없으므로 집계에 섞이지 않는다. */
  pending: { userId: string; name: string | null }[];
};

export function attendance(
  members: { userId: string; name: string | null }[],
  done: GroupMember[],
): Attendance {
  const hasDone = new Set(done.map((d) => d.userId));
  return {
    enrolled: members.length,
    done,
    pending: members.filter((m) => !hasDone.has(m.userId)),
  };
}

// ── 블록 1 · 돌봄 우선 명단 ──────────────────────────────────────────────────
/** `careBanner` 가 내는 순서 그대로다 — 새 판정을 만들지 않는다. */
const CARE_ORDER: CareKind[] = ['byVitality', 'byCareCheck', 'languish'];

/** 화면이 다는 트리거 태그. 첨부 HTML 의 `ctag` 자리. */
export const CARE_TAG: Record<CareKind, string> = {
  byVitality: 'byVitality',
  byCareCheck: 'byCareCheck',
  languish: '시들음',
};

export type CareRow = { member: GroupMember; kind: CareKind; body: string; vitality: number };

/**
 * **한 사람당 가장 높은 신호 하나만**이고, 명단이 그 순서로 선다.
 *   `careBanner` 가 이미 «위에서부터 하나» 를 고르므로 **여기서 다시 고르지 않는다** —
 *   두 곳에서 고르면 한 곳만 고쳐질 때 갈린다.
 */
export function careList(done: GroupMember[]): CareRow[] {
  const rows: CareRow[] = [];
  for (const m of done) {
    const b = careBanner(m.scores);
    if (b) rows.push({ member: m, kind: b.kind, body: b.body, vitality: m.scores.vitality.score });
  }
  return rows.sort((a, b) => {
    const d = CARE_ORDER.indexOf(a.kind) - CARE_ORDER.indexOf(b.kind);
    return d !== 0 ? d : a.vitality - b.vitality; // 같은 신호면 낮은 활력이 먼저
  });
}

// ── 블록 2 · 활력 분포 ───────────────────────────────────────────────────────
export type VitalityBucket = { name: string; from: number; to: number; color: string; members: GroupMember[] };

/** 구간은 `VITALITY_ZONES` 가 정본이다 — 경계(10/11 · 17/18)를 여기 다시 적지 않는다. */
export function vitalityBuckets(done: GroupMember[]): VitalityBucket[] {
  const buckets: VitalityBucket[] = VITALITY_ZONES.map((z) => ({
    name: z.name, from: z.from, to: z.to, color: z.color, members: [],
  }));
  for (const m of done) {
    const z = vitalityZone(m.scores.vitality.score);
    const b = buckets.find((x) => x.name === z.name);
    if (b) b.members.push(m);
  }
  for (const b of buckets) b.members.sort((x, y) => x.scores.vitality.score - y.scores.vitality.score);
  return buckets;
}

export function vitalityMean(done: GroupMember[]): number | null {
  if (done.length === 0) return null;
  return done.reduce((a, m) => a + m.scores.vitality.score, 0) / done.length;
}

// ── 블록 3 · 함정 분포(소그룹 편성) ──────────────────────────────────────────
/** 함정별 한 줄 설명 — 첨부 HTML 의 `gdesc` 자리. **인도자 전용 어휘**다(참여자 미노출). */
export const TRAP_DESC: Record<'D1' | 'D2' | 'D3', string> = {
  D1: '품고만 있음 · 마음엔 있는데 첫 발이 안 떨어짐',
  D2: '준비라는 이름의 미룸 · 시작 조건을 계속 높임',
  D3: '나쁘지 않음의 덫 · 불만이 없어 동력도 없음',
};

export type TrapGroup = { code: 'D1' | 'D2' | 'D3'; label: string; desc: string; members: GroupMember[] };

/**
 * **`trap.primary` 를 그대로 쓴다.** 동점 규칙(D1→D2→D3)은 `scoring.ts` 안에 있고
 *   여기서 다시 판정하지 않는다 — 새 판정을 만들면 두 규칙이 갈린다(발주 인수 4).
 */
export function trapGroups(done: GroupMember[]): TrapGroup[] {
  return TRAP_AXES.map((a) => ({
    code: a.code,
    label: a.label,
    desc: TRAP_DESC[a.code],
    members: done
      .filter((m) => m.scores.trap.primary === a.code)
      .sort((x, y) => y.scores.trap[a.code] - x.scores.trap[a.code]), // 깊이 걸린 사람이 위로
  }));
}

// ── 블록 4 · 가장 간절한 영역 ────────────────────────────────────────────────
export type GapGroup = { code: string; label: string; members: { member: GroupMember; score: number }[] };

/**
 * **간격이 가장 큰 = 점수가 가장 낮은** 영역을 사람마다 고른다.
 *
 * ★ **동점이면 양쪽에 모두 집계한다**(발주 인수 5) — 표식은 달지 않는다.
 *   점수가 병기되므로 식별이 되고, 표식을 달면 «둘 중 하나가 진짜» 처럼 읽힌다.
 *   그래서 **합이 인원수보다 클 수 있다** — 캡션이 그 사실만 말한다.
 */
export function gapGroups(done: GroupMember[]): GapGroup[] {
  const out: GapGroup[] = GAP_AXES.map((a) => ({ code: a.code, label: a.label, members: [] }));
  for (const m of done) {
    const vals = GAP_AXES.map((a) => ({ code: a.code, score: m.scores.gap[a.code as keyof FuturenowScores['gap']] }));
    const min = Math.min(...vals.map((v) => v.score));
    for (const v of vals) {
      if (v.score !== min) continue;
      const g = out.find((x) => x.code === v.code);
      if (g) g.members.push({ member: m, score: v.score });
    }
  }
  for (const g of out) g.members.sort((a, b) => a.score - b.score);
  return out;
}
