// 회차 갈무리 '읽기모델'(ADR-86). 저장된 answers·플래그를 카드 순서 그대로의 표시 블록으로 바꾼다.
//   참여자 열람과 인도자 열람이 이 한 파일을 공유한다(audience 로만 갈린다).
//   코어는 이 모듈을 모른다(인스트루먼트 소유). 회차 추가 = sessionN.ts + 레지스트리 한 줄이면 여기는 0줄 수정.
//
// 규율 셋:
//   (1) 회차번호로 분기하지 않는다 — 블록의 '존재'로 분기한다(ADR-85와 동일 원칙).
//   (2) 응답 키를 리터럴로 알지 않는다 — 전부 레지스트리(copy.*.key)에서 해석한다.
//   (3) 한국어 문자열 리터럴 0 — 라벨·보조문구는 전부 sessionN.ts 원문. 문안 이중진실을 만들지 않는다.
//       (표시 전용 신규 문안이 필요하면 뷰 컴포넌트가 갖는다. 이 파일은 갖지 않는다.)
import { getCheckinSession } from './index';

// 누가 보는가. 'self'=작성자 본인 · 'facilitator'=인도자(코치·운영자).
export type ReadAudience = 'self' | 'facilitator';

// answers 가 아닌 컬럼 플래그(ADR-80). 가시성 판정에 쓴다.
export type ReadFlags = {
  stepPrivate: boolean;
  suggestionAnon: boolean;
  contactRequest: boolean;
};

export type ReadBlock =
  // 한 쌍(1회차 갈망 A→B)
  | { kind: 'pair'; label: string; help?: string; fromLabel: string; fromValue: string; toLabel: string; toValue: string }
  // 단문·장문·칩 단일선택 공통
  | { kind: 'text'; label: string; help?: string; value: string }
  // 여러 값(마음 — 선택 항목 + 직접 쓰기)
  | { kind: 'list'; label: string; help?: string; values: string[] }
  // 0~10 숫자. 막대·색·백분위 없이 숫자와 양끝 라벨만(ADR-80: 갈무리는 채점 대상 아님).
  | { kind: 'scale'; label: string; help?: string; value: number; leftLabel: string; rightLabel: string }
  // 체크된 플래그만. 미체크는 블록 자체가 없다.
  | { kind: 'flag'; label: string; help?: string }
  // 레지스트리 고지 원문(공개 안내 등)을 그대로 옮길 때.
  | { kind: 'note'; text: string }
  // 심화·인도자 상자 같은 묶음. id 는 뷰가 사진 위치를 잡는 데만 쓴다.
  | { kind: 'group'; id?: string; title: string; blocks: ReadBlock[] }
  // 본인이 비공개로 둔 자리(인도자 화면 전용). 내용은 0이고 '왜 비었는지'만 참여자 원문으로 알린다.
  | { kind: 'hidden'; label: string };

// 심화 묶음 id — 뷰가 편지 사진을 이 묶음 끝에 붙인다.
export const DEEPEN_GROUP_ID = 'deepen';

function text(answers: Record<string, unknown>, key: string): string {
  const v = answers[key];
  return typeof v === 'string' ? v.trim() : '';
}

function strList(answers: Record<string, unknown>, key: string): string[] {
  const v = answers[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];
}

function num(answers: Record<string, unknown>, key: string): number | null {
  const v = answers[key];
  return typeof v === 'number' ? v : null;
}

// 값이 있는 text 블록만 push(빈 값은 블록째 생략 — 빈 줄·'(빈칸)' 을 만들지 않는다).
function pushText(out: ReadBlock[], label: string, value: string, help?: string): void {
  if (value !== '') out.push({ kind: 'text', label, value, ...(help ? { help } : {}) });
}

/**
 * 저장된 갈무리 한 건을 표시 블록 배열로. 미등록 회차는 빈 배열.
 * 빈 값·미체크 플래그는 블록째 생략한다.
 */
export function buildCheckinRead(
  sessionNo: number,
  answers: Record<string, unknown>,
  flags: ReadFlags,
  audience: ReadAudience,
): ReadBlock[] {
  const copy = getCheckinSession(sessionNo);
  if (!copy) return [];

  const out: ReadBlock[] = [];
  const isSelf = audience === 'self';

  // 1면 — 카드와 **같은 order** 를 훑는다(ADR-90). 열람 순서가 작성 순서와 어긋나면 안 된다.
  //   되비추기(mirror)는 '지금 쓰는 것을 돕는' 작성 보조라 열람에는 싣지 않는다(ADR-86).
  //   group(묶음 이정표)도 열람에는 싣지 않는다 — 작성 중 화제 전환을 알리는 장치이지 기록이 아니다.
  const t = copy.today;
  for (const name of t.order) {
    switch (name) {
      case 'pairText': {
        const b = t.pairText;
        if (!b) break;
        const from = text(answers, b.from.key);
        const to = text(answers, b.to.key);
        if (from !== '' || to !== '') {
          out.push({ kind: 'pair', label: b.label, fromLabel: b.from.label, fromValue: from, toLabel: b.to.label, toValue: to });
        }
        break;
      }
      case 'areaPick': {
        const b = t.areaPick;
        if (!b) break;
        pushText(out, b.label, text(answers, b.key));
        // ADR-98: 줄 수를 회차가 정한다(2회차 하나 · 3회차 둘).
        for (const ln of b.lines) pushText(out, ln.label, text(answers, ln.key));
        break;
      }
      case 'purpose': {
        const b = t.purpose;
        if (!b) break;
        const purposeBlocks: ReadBlock[] = [];
        for (const f of b.fields) pushText(purposeBlocks, f.label, text(answers, f.key));
        if (purposeBlocks.length > 0) out.push({ kind: 'group', title: b.title, blocks: purposeBlocks });
        break;
      }
      case 'question': {
        const b = t.question;
        if (b) pushText(out, b.label, text(answers, b.key));
        break;
      }
      case 'identity': {
        const b = t.identity;
        if (b) pushText(out, b.label, text(answers, b.key));
        break;
      }
      case 'mood': {
        // 선택 항목 + 직접 쓰기를 한 줄로. moodCustom 은 레지스트리에 라벨이 없어(placeholder 뿐)
        //   열람용 라벨을 새로 짓지 않고 mood 값에 이어 붙인다(카드도 같은 Field 안에 있다).
        const moodValues = strList(answers, t.mood.key);
        const moodCustom = text(answers, t.moodCustom.key);
        const moodAll = moodCustom !== '' ? [...moodValues, moodCustom] : moodValues;
        if (moodAll.length > 0) out.push({ kind: 'list', label: t.mood.label, values: moodAll });
        break;
      }
      // 망라성 가드 — SlotName 에 슬롯이 늘면 여기서 컴파일이 깨진다.
      //   없으면 새 슬롯이 조용히 누락돼 참여자가 쓴 답이 열람에서 사라진다(신호 0).
      default: {
        const _never: never = name;
        void _never;
        break;
      }
    }
  }

  // ④ 심화 — 열람에서는 항상 펼친다(카드의 접힘 토글은 계측 컬럼 deep_opened 를 세우므로 재현하지 않는다).
  const deepBlocks: ReadBlock[] = [];
  for (const f of copy.deepen.fields) pushText(deepBlocks, f.label, text(answers, f.key));
  if (deepBlocks.length > 0) {
    out.push({ kind: 'group', id: DEEPEN_GROUP_ID, title: copy.deepen.title, blocks: deepBlocks });
  }

  // ⑤ 지난 한 걸음 결산(2회차~) — ⑥ 과 다른 블록이므로 stepPrivate 사정권 밖이다.
  const lastStep = copy.step.lastStep;
  if (lastStep) {
    pushText(out, lastStep.label, text(answers, lastStep.key));
    // note.help('지키지 못했어도 괜찮습니다…')는 값을 미이행 판정으로 읽지 않게 하는 장치라 열람에도 남긴다.
    pushText(out, lastStep.note.label, text(answers, lastStep.note.key), lastStep.note.help);
  }

  // ⑥ 다음 한 걸음 — 참여자가 켠 비공개 토글은 '한 걸음' 블록 전체를 덮는다(지휘부 결정 2026-08-02).
  const share = copy.step.share;
  const stepHiddenFromFacilitator = !isSelf && flags.stepPrivate;
  if (stepHiddenFromFacilitator) {
    // 내용 0. '안 썼다'와 '비공개로 썼다'를 인도자가 구분하도록 사실만 남긴다.
    // 문구는 참여자가 실제로 읽고 켠 토글 원문 그대로(신규 문안 0). 토글이 없는 회차면 자리 표시도 두지 않는다.
    if (share?.toggleLabel) out.push({ kind: 'hidden', label: share.toggleLabel });
  } else {
    pushText(out, copy.step.what.label, text(answers, copy.step.what.key));
    pushText(out, copy.step.when.label, text(answers, copy.step.when.key));
    pushText(out, copy.step.blocker.label, text(answers, copy.step.blocker.key));
    // 공개 여부는 본인에게만 되돌려 준다 — 켰으면 토글 원문, 껐으면 공개 고지 원문.
    if (isSelf && share) {
      if (flags.stepPrivate && share.toggleLabel) out.push({ kind: 'flag', label: share.toggleLabel });
      else out.push({ kind: 'note', text: share.notice });
    }
  }

  // ⑦ 자신감 — 구분선 아래 '3면 마무리'라 ⑥ 블록 밖이다(비공개 토글 사정권 밖).
  //    help('낮게 적힌 숫자가 인도자에게는 가장 쓸모 있습니다…')를 함께 실어 값이 평가로 읽히지 않게 한다.
  //    ADR-91 D 가 이 문구를 '허락'에서 '용도'로 바꿨다(옛 문구: '솔직하게요. 낮게 답하셔도 아무 일 없습니다').
  //    ADR-86 표시 규율(막대·게이지·색·백분위·평균·정렬키 금지)은 그대로다 — 근거 둘 중 문안 쪽만 바뀌었고
  //    ADR-80 의 '채점 대상 아님'은 문안과 무관하게 살아 있다(ADR-94 §1).
  const confidence = num(answers, copy.wrap.confidence.key);
  if (confidence != null) {
    out.push({
      kind: 'scale',
      label: copy.wrap.confidence.label,
      help: copy.wrap.confidence.help,
      value: confidence,
      leftLabel: copy.wrap.confidence.leftLabel,
      rightLabel: copy.wrap.confidence.rightLabel,
    });
  }

  // ⑧ 인도자 상자
  const box = copy.wrap.facilitatorBox;
  const boxBlocks: ReadBlock[] = [];
  // 부탁 — 수신자가 문안에 인도자로 명시된 유일한 자유서술. 실명으로 전달한다.
  pushText(boxBlocks, box.need.label, text(answers, box.need.key));
  // 바라는 점 — 참여자의 익명 토글을 존중한다(지휘부 결정 2026-08-02).
  //   익명이면 여기(이름이 붙는 자리)에서 빼고, 회차 단위 무기명 섹션이 따로 모은다.
  if (isSelf || !flags.suggestionAnon) {
    pushText(boxBlocks, box.suggestion.label, text(answers, box.suggestion.key));
  }
  // 익명 체크 상태는 본인에게만 — 그가 읽은 문장 그대로 되돌려 준다.
  //   인도자에게는 배치(익명 섹션 vs 실명)로 이미 드러나므로 값 노출은 재식별 단서만 늘린다.
  if (isSelf && flags.suggestionAnon) boxBlocks.push({ kind: 'flag', label: box.suggestionAnon.label });
  // 연락 요청 — help('짧은 안부 연락입니다. 코칭 세션이 아닙니다.')를 함께 실어 '코칭 신청' 오독을 막는다.
  if (flags.contactRequest) {
    boxBlocks.push({ kind: 'flag', label: box.contactRequest.label, help: box.contactRequest.help });
  }
  if (boxBlocks.length > 0) out.push({ kind: 'group', title: box.title, blocks: boxBlocks });

  // ⑨ 나에게 남긴 말 — 본인 화면에서는 뷰가 accent 인용구로 따로 강조하므로 블록 배열에는 넣지 않는다.
  //    인도자에게는 실명으로 표시한다(지휘부 결정 2026-08-02 · save.notice2 고지 근거).
  if (!isSelf) pushText(out, copy.wrap.selfNote.label, text(answers, copy.wrap.selfNote.key));

  return out;
}

/** 본인 화면 상단 요약(자기 문장 되돌려주기)에 쓰는 값. 뷰가 accent 박스로 강조한다. */
export function readSelfHighlights(
  sessionNo: number,
  answers: Record<string, unknown>,
): { selfNote: string; stepHeading: string; stepWhat: string; stepWhen: string } | null {
  const copy = getCheckinSession(sessionNo);
  if (!copy) return null;
  return {
    selfNote: text(answers, copy.wrap.selfNote.key),
    stepHeading: copy.done.stepHeading,
    stepWhat: text(answers, copy.step.what.key),
    stepWhen: text(answers, copy.step.when.key),
  };
}

/** 인도자 무기명 섹션이 쓰는 '이름 없이 온 말' 한 건. 실명 자리에는 절대 두지 않는다. */
export function readAnonSuggestion(
  sessionNo: number,
  answers: Record<string, unknown>,
  flags: Pick<ReadFlags, 'suggestionAnon'>,
): string {
  const copy = getCheckinSession(sessionNo);
  if (!copy || !flags.suggestionAnon) return '';
  return text(answers, copy.wrap.facilitatorBox.suggestion.key);
}

/** 무기명 섹션 캡션 — 참여자가 읽은 고지 원문을 인도자 쪽에도 그대로 상기시킨다(신규 문안 0). */
export function anonNoticeText(sessionNo: number): string {
  return getCheckinSession(sessionNo)?.wrap.facilitatorBox.suggestionAnon.label ?? '';
}

/** 인도자 '부탁' 섹션 제목·라벨을 레지스트리에서. */
export function needLabel(sessionNo: number): string {
  return getCheckinSession(sessionNo)?.wrap.facilitatorBox.need.label ?? '';
}
