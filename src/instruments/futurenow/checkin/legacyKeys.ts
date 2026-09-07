// 옛 키 → 새 키 (CC MEMO v3 · 문안 보정).
//
// ─────────────────────────────────────────────────────────────────────────────
// **왜 필요한가 — 지시서 §6 의 「저장된 응답이 0건이다」가 사실이 아니었다.**
//
//   착수 전 실측(개수와 키 «이름»만 읽었다 · 참여자 원문 0):
//     6회차 갈무리 행 **7** · 제출 **1** · 내용 있음 **3** · 창이 열린 회기 **넷**
//     저장된 폐기 키 — `top_identity` 2 · `worldview_seen` 2 · `lasting_one` 1
//
//   `checkins.answers` 는 JSONB 이고 **키로만** 읽는다. 그래서 키를 갈면 **코드는 안 깨지고**
//   (세 키를 이름으로 읽는 곳이 `session6.ts` 밖에 0곳 — ADR-85 가 하드코딩을 걷었다)
//   **저장된 값만 조용히 사라진다.** 인도자 회차 표(`summaryFields`)와 종단 축이 그 자리다.
//
// **마이그레이션은 하지 않는다** — 「실기수는 손대지 마라. 재는 것도 읽기만이다」(지휘부).
//   그래서 **저장은 언제나 새 키로 하고, 읽을 때만** 옛 키를 폴백한다.
//
// **수명이 정해져 있다.** 2기(ZR4KB)의 6회차 창은 2026-10-25 에 열린다 — 아직 열리지 않았으므로
//   새 키로 깨끗이 간다. 즉 이 표는 **1기(HMT7Z) 전용**이고, 1기 종료 리포트가 끝나면 걷는다.
//   걷을 때 이 파일과 `legacyKeys.test.ts` 를 함께 지운다.
// ─────────────────────────────────────────────────────────────────────────────

/** 회차 → (옛 키 → 새 키). 새 회차를 더할 일이 없기를 바라는 표다. */
export const LEGACY_KEYS: Readonly<Record<number, Readonly<Record<string, string>>>> = {
  6: {
    lasting_one: 'carry_today',
    top_identity: 'hope_statement',
    worldview_seen: 'biggest_regret',
  },
};

/**
 * 읽기 전용 별칭. **새 키에 값이 있으면 손대지 않는다** — 새로 쓴 답이 옛 답에 덮이면 안 된다.
 * 값이 없을 때만 옛 키를 끌어온다. 입력을 고치지 않고 필요할 때만 사본을 만든다.
 */
export function withLegacyKeys(
  sessionNo: number,
  answers: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const src = answers ?? {};
  const map = LEGACY_KEYS[sessionNo];
  if (!map) return src;
  let out = src;
  for (const [old, now] of Object.entries(map)) {
    if (out[now] === undefined && src[old] !== undefined) {
      if (out === src) out = { ...src };
      out[now] = src[old];
    }
  }
  return out;
}
