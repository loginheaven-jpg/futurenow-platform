// 필수 칸 선언과 그 파생(ADR-91). filledCount 와 missingLabels 를 **한 선언에서** 뽑는다.
//   둘을 따로 손으로 쓰면 세 회차 × 두 함수가 서로 어긋날 수 있고, 어긋나면
//   '제출을 막았는데 무엇이 비었는지는 못 알려 주는' 상태가 된다. 그 가능성을 구조로 없앤다.
//
// 규칙(ADR-80 이래 불변):
//   · 묶음 하나가 필수 한 칸이다. 쌍 문항(무엇을+언제)은 **둘 다** 채워야 한 칸으로 센다.
//   · 문자열은 공백만 있으면 빈 것으로 본다. 배열(마음)은 하나 이상이어야 한다.
//   · confidence 는 세지 않는다(설계대로). 결측 안내에서만 선택 항목으로 따로 다룬다.

/** 필수 묶음의 한 칸. label 은 참여자가 화면에서 보는 문구 그대로다(결측 안내가 이걸 그대로 읽어 준다). */
export type RequiredField = {
  key: string;
  label: string;
  /**
   * 대체 칸(ADR-101). 이 칸이 비어도 `altKey` 에 값이 있으면 충족으로 본다. **문자열로만 판정한다.**
   *
   * 마음(3회차)에 쓴다 — 칩은 `mood`, 직접 쓰기는 `mood_custom` 이라 **서로 다른 칸**이다.
   * 그래서 목록에 없는 감정을 직접 쓰기에만 정성껏 적은 사람이 `mood` 가 빈 배열이라 제출에서 막혔다.
   * 본인은 방금 적었는데 '마음이 비었다'는 안내를 받는다 — ADR-91 A 가 없애려던 그 막힘이다.
   *
   * **칩을 대신 눌러 주는 방식은 쓰지 않는다.** 그러면 참여자가 하지 않은 말('딱 맞는 말이 없음')을
   * 시스템이 그 사람 이름으로 저장하게 되고, 그 값이 인도자 화면과 4회차 낱말 교체 판단의 실측에까지
   * 들어간다. 저장값을 만들지 않고 **판정에서만** 인정한다 — 열람은 이미 안전하다
   * (`readModel` 이 칩과 직접 쓰기를 한 줄로 합쳐 보여 준다).
   */
  altKey?: string;
};

/** 필수 묶음. fields 가 둘이면 쌍 문항이며 둘 다 채워야 충족이다. */
export type RequiredGroup = {
  fields: RequiredField[];
  /** 'list' = 배열 응답(마음). 기본은 문자열. */
  kind?: 'list';
};

function filledText(v: unknown): boolean {
  return typeof v === 'string' && v.trim() !== '';
}

function filledField(answers: Record<string, unknown>, f: RequiredField, kind?: 'list'): boolean {
  const v = answers[f.key];
  const ok = kind === 'list' ? Array.isArray(v) && v.length > 0 : filledText(v);
  if (ok) return true;
  return f.altKey ? filledText(answers[f.altKey]) : false;
}

/** 충족한 묶음 수. */
export function countFilled(groups: RequiredGroup[], answers: Record<string, unknown>): number {
  return groups.filter((g) => g.fields.every((f) => filledField(answers, f, g.kind))).length;
}

/**
 * 빈 필수 칸의 라벨 목록. 참여자가 '무엇이 비었는지' 알아야 채우러 갈 수 있으므로
 * 숫자가 아니라 라벨을 낸다. 쌍 문항은 **비어 있는 쪽만** 낸다.
 */
export function missingIn(groups: RequiredGroup[], answers: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const g of groups) {
    if (g.fields.every((f) => filledField(answers, f, g.kind))) continue;
    for (const f of g.fields) if (!filledField(answers, f, g.kind)) out.push(f.label);
  }
  return out;
}

/** 빈 필수 칸의 응답 키 목록. '채우러 가기'가 첫 칸으로 옮겨 가는 데 쓴다(라벨과 순서가 같다). */
export function missingKeys(groups: RequiredGroup[], answers: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const g of groups) {
    if (g.fields.every((f) => filledField(answers, f, g.kind))) continue;
    for (const f of g.fields) if (!filledField(answers, f, g.kind)) out.push(f.key);
  }
  return out;
}
