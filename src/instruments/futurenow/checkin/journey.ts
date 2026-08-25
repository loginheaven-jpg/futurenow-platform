// 갈무리 누적 조회의 조립·판정(ADR-118). 순수 함수 — 화면 넷이 이 결과를 그리기만 한다.
//   판정을 컴포넌트 안에 두면 "참여자 화면에 신호가 안 들어갔는가"를 테스트로 증명할 수 없다.
//
// 인스트루먼트에 두는 이유: 종단 축 조립이 `summaryFields` 를 읽으므로 **문안 구조를 안다.**
//   코어는 회차를 몰라야 한다(ADR-90). 계약(`/contracts`)만 바라본다 — 코어를 import 하지 않는다.
import type { CheckinRecord, CohortSession } from '@/contracts';
import { getCheckinSession } from './index';

// ── 칸 상태 ────────────────────────────────────────────────────────────────
// **행이 없어도 '미착수'와 '아직 안 열림'은 다르다** — 전자는 연락할 사람이고 후자는 아니다.
//   둘을 같은 회색으로 칠하면 인도자가 지금 연락할 사람을 못 고른다(1기 5회차가 그 상태였다).
export type CellState = 'submitted' | 'drafting' | 'empty' | 'notopen';

/**
 * 한 칸의 상태. `hasContent` 는 실제 컬럼이라 **행 존재 ≠ 작성 중**이다 —
 * 전면 안내(배너)가 만든 빈 행이 있고, 그것은 미착수로 봐야 한다.
 */
export function cellState(row: CheckinRecord | null, session: CohortSession, now: Date): CellState {
  if (row?.submittedAt) return 'submitted';
  if (row?.hasContent) return 'drafting';
  if (now.getTime() < Date.parse(session.opensAt)) return 'notopen';
  return 'empty';
}

// ── 종단 축 ────────────────────────────────────────────────────────────────
/**
 * 종단 축 → 각 회차 `summaryFields` 인덱스.
 *
 * **`[0]` 을 기계적으로 뽑으면 안 된다** — 다섯 중 둘이 축에서 벗어난다(2회차는 `[0]` 이 '영역',
 * 4회차는 `[0]` 이 '이번에 시작할 프로젝트'라 정작 '인생의 원씽'이 빠진다).
 * 여기는 **'어느 것'만** 정한다 — 라벨·키·값은 전부 문안이 준다(새 문안 0).
 *
 * 3회차가 `gap_want`('지금 가장 바라는 것')인 이유: 칩으로 고른 `gap_area` 는 `summaryFields` 에 없고,
 * 종단 축의 나머지 넷이 전부 문장인데 `gap_area` 는 낱말 하나다. `index.ts` 의 축 주석도 그에 맞췄다.
 *
 * 6회차는 발주 시 한 줄 더한다. **7회차는 인도자 세션이라 참여자 카드가 없다.**
 */
export const AXIS_INDEX: Record<number, number> = { 1: 0, 2: 1, 3: 0, 4: 3, 5: 0 };

/** 축 값 — `summaryFields` 가 단일 키와 한 쌍(1회차 갈망) 두 변형을 갖는다. */
export type AxisValue = { kind: 'text'; text: string } | { kind: 'pair'; from: string; to: string };

export type AxisEntry = {
  sessionNo: number;
  /** `summaryFields` 원문. 미등록 회차는 null */
  label: string | null;
  /** 값이 없으면 null — 화면이 상태로 대신 그린다(문구는 A·C 가 다르다) */
  value: AxisValue | null;
  state: CellState;
};

const str = (a: Record<string, unknown>, k: string): string => (typeof a[k] === 'string' ? (a[k] as string).trim() : '');

/**
 * 회차마다 축 한 줄. 값이 비면 `value: null` 이고 `state` 가 이유를 말한다.
 *
 * 상태 문구를 여기서 만들지 않는 이유: 인도자에게는 사실이고 참여자에게는 판정이 된다
 * (`미착수` vs `아직 비어 있어요`). 낱말은 화면이 고른다.
 */
export function longitudinalAxis(rows: CheckinRecord[], sessions: CohortSession[], now: Date): AxisEntry[] {
  const byNo = new Map(rows.map((r) => [r.sessionNo, r]));
  return [...sessions]
    .sort((a, b) => a.sessionNo - b.sessionNo)
    .map((s) => {
      const row = byNo.get(s.sessionNo) ?? null;
      const state = cellState(row, s, now);
      const copy = getCheckinSession(s.sessionNo);
      const field = copy ? copy.summaryFields[AXIS_INDEX[s.sessionNo] ?? 0] : undefined;
      if (!copy || !field) return { sessionNo: s.sessionNo, label: null, value: null, state };
      const a = row?.answers ?? {};
      if ('from' in field) {
        const from = str(a, field.from);
        const to = str(a, field.to);
        // 한쪽만 있으면 화살표가 거짓말을 한다 — 둘 다 있을 때만 쌍으로 그린다.
        return { sessionNo: s.sessionNo, label: field.label, value: from && to ? { kind: 'pair' as const, from, to } : null, state };
      }
      const text = str(a, field.key);
      return { sessionNo: s.sessionNo, label: field.label, value: text ? { kind: 'text' as const, text } : null, state };
    });
}

// ── 신호 ───────────────────────────────────────────────────────────────────
/**
 * 축이 셋이다. **`돌봄` 은 급이 아니라 종류다** —
 * `연락 요청` 만 참여자가 **직접 손을 든 것**이고 나머지 넷은 전부 코드의 추론이다.
 * 빈도가 아니라 확실성으로 자리를 정하는 곳이라 같은 축에 놓지 않는다(ADR-118).
 */
export type SignalTier = 'care' | 'primary' | 'secondary';
export type Signal = { kind: string; reason: string; tier: SignalTier };

/**
 * 자신감 급락 임계 — **새로 정한 값이다.**
 *
 * 10점 척도에서 3점 이동은 구간 하나를 건너뛴 크기이고, 1기 실측에서 낙폭 5가 1건 · 3이 1건 · 1~2가 3건이라
 * 3이 둘을 가른다. **ADR-94 의 `3 이하`(절대값 임계)와는 종류가 다른 수치이므로 그것을 근거로 삼지 않는다**
 * (`8→5` 는 낙폭 3이나 5는 낮은 값이 아니고, `3→2` 는 낙폭 1이나 둘 다 위험 구간이다).
 * 1기 표본이 얇아 조정 근거가 없으므로 고정하고 2기 데이터로 재본다.
 */
export const CONFIDENCE_DROP = 3;

const nums = (a: Record<string, unknown>, k: string): number | null => (typeof a[k] === 'number' ? (a[k] as number) : null);
const listNos = (nos: number[]): string => nos.join('·');

export function checkinSignals(rows: CheckinRecord[], sessions: CohortSession[], now: Date): Signal[] {
  const byNo = new Map(rows.map((r) => [r.sessionNo, r]));
  const ordered = [...sessions].sort((a, b) => a.sessionNo - b.sessionNo);
  const out: Signal[] = [];
  // 판정만 보이면 인도자가 이유를 다시 찾는다 — 근거를 항상 함께 싣는다.
  const push = (kind: string, reason: string, tier: SignalTier) => out.push({ kind, reason, tier });

  // 돌봄 — 참여자가 직접 요청. 켜지는 순간 가장 확실하다.
  const asked = ordered.filter((s) => byNo.get(s.sessionNo)?.contactRequest).map((s) => s.sessionNo);
  if (asked.length > 0) push('contact-request', `${listNos(asked)}회차 연락 요청`, 'care');

  // 주 — 작성 중 방치. **시작했고 막힌 사람**이라 미착수와 다르다. 1기 10건이 여기 있다.
  const stale = ordered
    .filter((s) => cellState(byNo.get(s.sessionNo) ?? null, s, now) === 'drafting' && now.getTime() > Date.parse(s.closesAt))
    .map((s) => s.sessionNo);
  if (stale.length > 0) push('stale-draft', `${listNos(stale)}회차 작성 중(마감 지남)`, 'primary');

  // 주 — 연속 미착수. **열린 회차만** 센다(아직 안 열린 회차는 연락할 이유가 아니다).
  const openedStates = ordered
    .map((s) => ({ no: s.sessionNo, st: cellState(byNo.get(s.sessionNo) ?? null, s, now) }))
    .filter((x) => x.st !== 'notopen');
  let run: number[] = [];
  const runs: number[][] = [];
  for (const x of openedStates) {
    if (x.st === 'empty') run.push(x.no);
    else {
      if (run.length >= 2) runs.push(run);
      run = [];
    }
  }
  if (run.length >= 2) runs.push(run);
  if (runs.length > 0) push('idle-streak', `${runs.map(listNos).join(' · ')}회차 미착수`, 'primary');

  // 주 — 자신감 급락. **직전 '응답' 회차 대비**다 — 인접만 보면 재료의 절반을 버린다.
  //   1기 실측: 인접 `1→2`(8→3) 하나, 건너뜀 `1→4`(5→2) 하나. 뒤엣것이 세 회차를 침묵한 사람이라 더 중요하다.
  //   제출분만 본다 — 초안 값은 아직 바뀔 수 있다.
  const answered = ordered
    .map((s) => byNo.get(s.sessionNo))
    .filter((r): r is CheckinRecord => !!r?.submittedAt)
    .map((r) => ({ no: r.sessionNo, v: nums(r.answers, 'confidence') }))
    .filter((x): x is { no: number; v: number } => x.v !== null);
  const drops: string[] = [];
  for (let i = 1; i < answered.length; i++) {
    const prev = answered[i - 1];
    const cur = answered[i];
    if (prev.v - cur.v >= CONFIDENCE_DROP) drops.push(`${prev.no}→${cur.no}회차 급락(${prev.v}→${cur.v})`);
  }
  if (drops.length > 0) push('confidence-drop', drops.join(' · '), 'primary');

  // 보조 — 결산 악화. 1기 0건이나 조건은 둔다.
  const results = ordered
    .map((s) => byNo.get(s.sessionNo))
    .filter((r): r is CheckinRecord => !!r?.submittedAt)
    .map((r) => ({ no: r.sessionNo, v: str(r.answers, 'last_step_result') }))
    .filter((x) => x.v !== '');
  const worse: string[] = [];
  for (let i = 1; i < results.length; i++) {
    if (results[i - 1].v === '했습니다' && results[i].v === '잊고 지냈습니다') worse.push(`${results[i - 1].no}→${results[i].no}회차`);
  }
  if (worse.length > 0) push('result-worse', `${worse.join(' · ')} 결산 악화`, 'secondary');

  return out;
}

// ── 한 걸음의 연쇄 ─────────────────────────────────────────────────────────
export type StepLink = { sessionNo: number; what: string; when: string; result: string; confidence: number | null };

/**
 * 회차별 한 걸음과 그 결산. **자신감은 숫자만** — 막대·게이지·정렬키를 쓰지 않는다(ADR-86).
 * 미응답은 `null` 이고 화면이 `—` 로 그린다. 빈칸으로 두면 0으로 오해된다.
 */
export function stepChain(rows: CheckinRecord[]): StepLink[] {
  return [...rows]
    .sort((a, b) => a.sessionNo - b.sessionNo)
    .map((r) => ({
      sessionNo: r.sessionNo,
      what: str(r.answers, 'step_what'),
      when: str(r.answers, 'step_when'),
      result: str(r.answers, 'last_step_result'),
      confidence: nums(r.answers, 'confidence'),
    }))
    .filter((s) => s.what || s.result || s.confidence !== null);
}

// ── 마음의 궤적 ────────────────────────────────────────────────────────────
export type MoodPoint = { sessionNo: number; words: string[]; custom: string };

/** 칩과 직접 쓰기를 함께 준다 — 목록에 없는 감정을 직접 쓰기에만 적은 사람이 빈 줄이 되면 안 된다(ADR-101). */
export function moodTrail(rows: CheckinRecord[]): MoodPoint[] {
  return [...rows]
    .sort((a, b) => a.sessionNo - b.sessionNo)
    .map((r) => ({
      sessionNo: r.sessionNo,
      words: Array.isArray(r.answers.mood) ? (r.answers.mood as unknown[]).filter((w): w is string => typeof w === 'string') : [],
      custom: str(r.answers, 'mood_custom'),
    }))
    .filter((m) => m.words.length > 0 || m.custom !== '');
}

// ── 인도자에게 남긴 말 ─────────────────────────────────────────────────────
export type FacilitatorNote = { sessionNo: number; label: string; text: string };

/**
 * `need` 와 `suggestion` 을 회차 표시와 함께 모은다.
 *
 * **익명 제안은 싣지 않는다** — `readModel` 의 판정(`isSelf || !suggestionAnon`, 지휘부 결정 2026-08-02)을
 * 그대로 따른다. 이 화면은 이름이 붙는 자리이고, 참여자가 읽고 체크한 문안은
 * `이름 없이 전달합니다 … 글의 결로 짐작될 수 있습니다` 다 — **짐작은 인정해도 시스템이 이름을 붙이지는 않는다.**
 * 익명분은 회차 현황의 무기명 섹션이 계속 진다. 그래야 ⑤와 ⑦(CheckinReadView)이 같은 문장 집합을 보여 준다.
 */
export function facilitatorNotes(rows: CheckinRecord[]): { notes: FacilitatorNote[]; contactSessions: number[] } {
  const notes: FacilitatorNote[] = [];
  const contactSessions: number[] = [];
  for (const r of [...rows].sort((a, b) => a.sessionNo - b.sessionNo)) {
    const box = getCheckinSession(r.sessionNo)?.wrap.facilitatorBox;
    if (!box) continue;
    const need = str(r.answers, box.need.key);
    if (need) notes.push({ sessionNo: r.sessionNo, label: box.need.label, text: need });
    const suggestion = str(r.answers, box.suggestion.key);
    if (suggestion && !r.suggestionAnon) notes.push({ sessionNo: r.sessionNo, label: box.suggestion.label, text: suggestion });
    if (r.contactRequest) contactSessions.push(r.sessionNo);
  }
  return { notes, contactSessions };
}

// ── 진행 요약 ──────────────────────────────────────────────────────────────
export type JourneyProgress = { total: number; submitted: number; drafting: number; open: number; notopen: number };

/** 머리의 `제출 4 · 작성 중 1 · 남은 2회차 진행 중`. 회차 수는 `cohort_sessions` 가 정한다 — 7로 박지 않는다. */
export function journeyProgress(rows: CheckinRecord[], sessions: CohortSession[], now: Date): JourneyProgress {
  const byNo = new Map(rows.map((r) => [r.sessionNo, r]));
  const states = sessions.map((s) => cellState(byNo.get(s.sessionNo) ?? null, s, now));
  return {
    total: sessions.length,
    submitted: states.filter((s) => s === 'submitted').length,
    drafting: states.filter((s) => s === 'drafting').length,
    open: states.filter((s) => s === 'empty').length,
    notopen: states.filter((s) => s === 'notopen').length,
  };
}
