'use client';
// 회차 갈무리 카드(ADR-80·85). getCheckinSession(sessionNo)로 회차 문안을 직접 로드 — 회차번호로 분기하지 않고 '블록 존재'로 렌더.
//   copy 를 prop 으로 받지 않는다: copy 에 함수(filledCount·counter)가 있어 서버→클라 직렬화가 깨진다(레지스트리는 순수 모듈이라 클라 import 가능).
//   자동저장(디바운스 2s/blur)·단일버튼(save→submit)·완료상태. 판정·경고색 없음(참여자 화면). '설문·진단·지각·미제출·워크북' 미사용.
//   되비추기(prior): 지난 회차 답을 읽기전용 회색으로 되비춘다(§6). 공유 동의 UI 없음(나눔 동의는 인도자 개별 대면 — C2-d).
//   ADR-86: 모드 둘(read/edit)·URL 하나. read 는 적은 것 전부를 읽는 화면 — 서버 쓰기 0(계측 컬럼을 건드리지 않는다).
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CheckinPhoto } from '@/contracts';
import { Button, CheckRow, Disclosure, MultiChoiceChips, TextArea } from '@/core/ui';
import { getCheckinSession, type Mirror as MirrorSpec, type SlotName } from '@/instruments/futurenow/checkin';
import { orderedSlots, resolveMirror, slotBoundaries, type Boundary } from '@/instruments/futurenow/checkin/slots';
import { buildCheckinRead, readSelfHighlights } from '@/instruments/futurenow/checkin/readModel';
import { CheckinReadView } from '@/instruments/futurenow/checkin/CheckinReadView';
import { markCheckinOpenedAction, saveCheckinAction, submitCheckinAction } from './actions';
import { LetterPhotos } from './LetterPhotos';

type Flags = { suggestionAnon: boolean; contactRequest: boolean; deepOpened: boolean; stepPrivate: boolean };
// 되비추기 재료 — page 가 getMyCheckin(sessionNo-1)의 answers 를 통째로 넘긴다(§6·ADR-90). 없으면 null.
//   블록마다 Mirror.keys 로 필요한 키를 지목하므로 다이제스트가 아니라 원본이 온다.

const gray = { color: 'var(--color-text-muted)' } as const;
const help = { color: 'var(--color-text-secondary)' } as const;
// 필드 라벨 — 섹션 제목(t-body-lg)보다 낮은 위계(수정지시서 §4.1: '선택' 상자가 필수 구역보다 커 보이던 문제).
const fieldLabel = { color: 'var(--color-text)', fontSize: 15, fontWeight: 500 } as const;
// 단일행 입력 — 앱 전역 inputStyle(AuthGate)과 동일 박스형.
const inputBox = {
  width: '100%',
  minHeight: 'var(--tap-min)',
  padding: '0 var(--space-3)',
  borderRadius: 'var(--radius)',
  border: 'var(--border-hair) solid var(--color-border)',
  background: 'var(--color-surface-2)',
  color: 'var(--color-text)',
  font: 'inherit',
  fontSize: 15,
} as const;

// 빈 필수 칸 표식(ADR-91) — 판정·경고색을 쓰지 않는다. 한 번이라도 쓴 사람에게만 붙는다.
const EMPTY_MARK = '아직 비어 있어요';
const fieldId = (key: string) => `fld-${key}`;

// '채우러 가기' — 첫 빈 칸으로 옮겨 간다. 스크롤과 포커스를 함께 해야 폰에서 자리를 잃지 않는다.
function goToField(key: string) {
  const el = document.getElementById(fieldId(key));
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const focusable = el.querySelector<HTMLElement>('input, textarea, button');
  focusable?.focus({ preventScroll: true });
}

// badge — 묶음의 첫 칸이면서 선택인 문항에만 붙는다(ADR-90 규칙 확정).
//   같은 묶음에 딸린 보조 칸(step_blocker·last_step_note)은 앞 칸의 부속이라 표기하지 않고,
//   접힌 블록도 표기하지 않는다(접혀 있다는 사실이 이미 그 말을 한다 — ADR-82·88).
function Field({ label, helpText, badge, fieldKey, empty, children }: { label: string; helpText?: string; badge?: string; fieldKey?: string; empty?: boolean; children: React.ReactNode }) {
  return (
    <div id={fieldKey ? fieldId(fieldKey) : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
        <span style={fieldLabel}>{label}</span>
        {badge ? <span className="t-caption" style={gray}>{badge}</span> : null}
        {empty ? <span className="t-caption" style={gray}>{EMPTY_MARK}</span> : null}
      </div>
      {helpText ? <div className="t-caption" style={help}>{helpText}</div> : null}
      {children}
    </div>
  );
}

// 되비추기 — 읽기전용 회색(테두리 없음, 입력칸으로 오해 방지 · §6). 기울임 없음.
function MirrorLine({ caption, value }: { caption: string; value: string }) {
  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <div className="t-caption" style={gray}>{caption}</div>
      <div className="t-body" style={{ color: 'var(--color-text-secondary)' }}>{value}</div>
    </div>
  );
}

// 블록 속성으로 일반화된 되비추기(ADR-90). 지난 회차 answers 에서 keys 를 읽어 값이 있는 것만 ' · ' 로 잇는다.
//   값이 하나도 없으면 empty 문구(있을 때만). empty 도 없으면 블록 자체를 그리지 않는다.
function MirrorOf({ mirror, prior }: { mirror?: MirrorSpec; prior: Record<string, unknown> | null }) {
  const view = resolveMirror(mirror, prior);
  if (!view) return null;
  if (view.kind === 'value') return <MirrorLine caption={view.label} value={view.value} />;
  return <p className="t-caption" style={{ ...help, marginBottom: 'var(--space-3)' }}>{view.text}</p>;
}

// 묶음 경계(ADR-90) — 현재 블록의 group 이 직전과 다르면 그린다.
//   값이 있으면 hairline + 캡션, 없으면 hairline 만. 면의 첫 블록이면 hairline 을 생략하고 캡션만
//   (바로 위가 표지라 선이 겹친다). 이 한 규칙이 네 전이를 모두 덮는다.
//   단일 STEP 회차(1·2·6·7)는 group 이 전부 없어 전이가 없고 → 신규 hairline 0건.
function GroupBoundary({ boundary }: { boundary: Boundary }) {
  if (!boundary) return null;
  return (
    <div
      style={{
        borderTop: boundary.line ? 'var(--border-hair) solid var(--color-border)' : undefined,
        // 캡션이 있을 때만 선과 캡션 사이를 띄운다. 캡션 없는 '닫는 선'에 위아래 여백을 다 주면
        // 빈 띠 48px 이 생겨 선이 앞 블록의 밑줄처럼 붙어 보인다(두 묶음을 가르는 선이어야 한다).
        paddingTop: boundary.line && boundary.caption ? 'var(--space-6)' : undefined,
        marginBottom: boundary.caption ? 'var(--space-6)' : 'var(--space-5)',
      }}
    >
      {/* 캡션은 제목이 아니라 이정표다 — 라벨(15)·보조문구(13)보다 한 칸 아래(12·t-micro). */}
      {boundary.caption ? <div className="t-micro" style={{ color: 'var(--color-text-muted)' }}>{boundary.caption}</div> : null}
    </div>
  );
}

export function CheckinCardClient({
  cohortId,
  sessionNo,
  userId,
  initialAnswers,
  initialFlags,
  alreadyOpened,
  hasContent,
  closed,
  prior,
  initialMode,
  photos,
  preview = false,
}: {
  cohortId: string;
  sessionNo: number;
  userId: string;
  initialAnswers: Record<string, unknown>;
  initialFlags: Flags;
  alreadyOpened: boolean;
  hasContent: boolean;
  closed: boolean;
  prior: Record<string, unknown> | null;
  initialMode: 'read' | 'edit';
  photos: CheckinPhoto[];
  /** 미리보기(인도자 콘솔 /coach/cohort/[cohortId]/checkin/preview·ADR-92) — 서버 쓰기를 전부 막는다. 계측·저장·제출 어느 것도 일어나지 않는다. */
  preview?: boolean;
}) {
  const copy = getCheckinSession(sessionNo); // 순수 모듈 — 클라 import 안전(직렬화 경계 넘지 않음)
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [flags, setFlags] = useState<Flags>(initialFlags);
  const router = useRouter();
  const [mode, setMode] = useState<'edit' | 'read'>(initialMode);
  // 완료 문구('갈무리를 저장했습니다')는 이번 화면에서 방금 제출했을 때만. 3주 전 갈무리에 띄우면 거짓말이다.
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [readOpen, setReadOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  // 제출 게이트 — 눌렀을 때만 뜬다.
  //   표식(EMPTY_MARK) 조건은 `hasContent || gateSeen` 이고 **둘 다 필요하다**:
  //   · hasContent — 서버 값이라 다음 진입에도 살아 있다. 클라 state 로만 두면 홈에 갔다 오면 사라져
  //     무엇이 비었는지 또 모르게 된다(이게 주 조건이다).
  //   · gateSeen — hasContent 는 **페이지 로드 시점 스냅샷**이고 edit 모드에서는 갱신되지 않는다
  //     (router.refresh 는 제출 성공 때만). 그래서 처음 여는 사람이 1면을 채우고 저장을 누르면
  //     자동저장이 이미 서버에 반영됐어도 prop 은 여전히 false 다. 그 한 세션을 gateSeen 이 덮는다.
  const [gate, setGate] = useState<{ labels: string[]; keys: string[]; confidenceEmpty: boolean } | null>(null);
  const [gateSeen, setGateSeen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openMarked = useRef(false);

  // 최초 진입 표식(계측) — '작성 카드에 처음 들어온 시각'이므로 edit 모드일 때만 1회.
  //   지난 회차를 '읽으러' 들어온 진입이 섞이면 first_opened_at 이 영구 오염된다(ADR-80 1기 보정 근거).
  //   read→edit 전환도 작성 진입이므로 그 시점에 찍는다.
  useEffect(() => {
    if (preview || mode !== 'edit' || alreadyOpened || openMarked.current) return;
    openMarked.current = true;
    void markCheckinOpenedAction(cohortId, sessionNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const str = (k: string) => (typeof answers[k] === 'string' ? (answers[k] as string) : '');
  // 표식은 한 번이라도 쓴 사람에게만(처음 여는 사람은 시작이 무거워지지 않게). 게이트를 본 뒤에도 붙는다.
  const marksOn = hasContent || gateSeen;
  const missingSet = new Set(copy ? copy.missingKeys(answers) : []);
  const isEmpty = (k: string) => marksOn && missingSet.has(k);
  const mood = Array.isArray(answers.mood) ? (answers.mood as string[]) : [];
  // 목록 한계 낱말(exclusive)을 고른 상태면 직접 쓰기 안내를 바꾼다. 없는 회차는 기본 문구 그대로.
  const moodCustomHint =
    copy && copy.today.moodCustom.promptPlaceholder && mood.includes(copy.today.mood.exclusive)
      ? copy.today.moodCustom.promptPlaceholder
      : (copy?.today.moodCustom.placeholder ?? '');
  const confidence = typeof answers.confidence === 'number' ? (answers.confidence as number) : null;

  function scheduleSave(nextAnswers: Record<string, unknown>, nextFlags: Flags) {
    if (preview) return; // 미리보기는 아무것도 저장하지 않는다
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void doSave(nextAnswers, nextFlags), 2000);
  }
  async function doSave(a: Record<string, unknown>, f: Flags) {
    if (preview) return;
    const res = await saveCheckinAction(cohortId, sessionNo, a, f);
    if (res.ok) {
      setSaveFailed(false);
      const d = new Date();
      const ampm = d.getHours() < 12 ? '오전' : '오후';
      const h12 = ((d.getHours() + 11) % 12) + 1;
      setSavedAt(`${ampm} ${h12}시 ${String(d.getMinutes()).padStart(2, '0')}분`);
    } else setSaveFailed(true);
  }
  function setAnswer(k: string, v: unknown) {
    const next = { ...answers, [k]: v };
    setAnswers(next);
    scheduleSave(next, flags);
  }
  function setFlag(k: keyof Flags, v: boolean) {
    const next = { ...flags, [k]: v };
    setFlags(next);
    scheduleSave(answers, next);
  }
  const flushSave = () => { if (timer.current) clearTimeout(timer.current); void doSave(answers, flags); };

  // 제출 게이트(ADR-91) — 막는 것은 **제출**이지 저장이 아니다.
  //   실측: 1회차 제출 8건 중 3건이 2·3면을 통째로 건너뛴 채 맨 아래 버튼만 눌렀다.
  //   버튼은 언제나 눌린다(눌리지 않는 버튼은 고장으로 읽힌다). 누른 뒤가 갈릴 뿐이다.
  async function doSubmit() {
    if (preview) { setJustSubmitted(true); setMode('read'); return; } // 흐름만 보여 주고 서버는 건드리지 않는다
    setBusy(true);
    if (timer.current) clearTimeout(timer.current);
    const res = await submitCheckinAction(cohortId, sessionNo, answers, flags); // R2: save→submit 한 액션 내 순차
    setBusy(false);
    if (res.ok) {
      setJustSubmitted(true);
      setMode('read');
      router.refresh(); // 방금 올린 편지 사진이 read 화면에 바로 보이도록(서버 signed URL 재생성)
    } else setSaveFailed(true);
  }

  function onSubmit() {
    if (!copy) return;
    const labels = copy.missingLabels(answers);
    // confidence 는 필수가 아니지만(설계대로) 실측에서 제출 10건 중 6건이 비었다.
    //   필수가 다 찼는데 이것만 비면 막지 않고 한 번만 눈에 띄게 한다 — 주 버튼이 '이대로 제출'이 된다.
    const confidenceEmpty = typeof answers[copy.wrap.confidence.key] !== 'number';
    if (labels.length === 0 && !confidenceEmpty) return void doSubmit();
    setGateSeen(true);
    setGate({ labels, keys: copy.missingKeys(answers), confidenceEmpty });
  }

  const textInput = (key: string, placeholder?: string) => (
    <input
      value={str(key)}
      onChange={(e) => setAnswer(key, e.target.value)}
      onBlur={flushSave}
      placeholder={placeholder}
      aria-label={placeholder ?? key}
      style={inputBox}
    />
  );

  if (!copy) return null; // page 가 getCheckinSession 로 이미 가드 — 방어적 널체크

  // ── 열람(read) ── 적은 것 전부를 읽는 화면. 서버 쓰기 0(save·submit·markOpened 미호출, deep_opened 미갱신).
  if (mode === 'read') {
    const highlights = readSelfHighlights(sessionNo, answers);
    const blocks = buildCheckinRead(sessionNo, answers, flags, 'self');
    const hasStep = !!(highlights?.stepWhat || highlights?.stepWhen);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', paddingTop: 'var(--space-4)' }}>
        {/* 완료 문구는 방금 제출했을 때만. 재방문·지난 회차 진입에는 띄우지 않는다. */}
        {justSubmitted ? <div className="t-body-lg" style={{ color: 'var(--color-text)' }}>{copy.done.title}</div> : (
          <div>
            <div className="t-caption" style={{ color: 'var(--color-primary)' }}>{copy.cover.brand}</div>
            <div className="t-caption" style={help}>{copy.cover.subtitle}</div>
          </div>
        )}

        {highlights?.selfNote ? (
          <div style={{ padding: 'var(--space-5)', background: 'var(--color-accent-soft, var(--color-surface-2))', border: 'var(--border-hair) solid var(--color-accent)', borderRadius: 'var(--radius)' }}>
            <div className="t-h2" style={{ color: 'var(--color-primary)', margin: 0 }}>“{highlights.selfNote}”</div>
          </div>
        ) : null}

        {hasStep ? (
          <div>
            <div className="t-caption" style={help}>{copy.done.stepHeading}</div>
            <div className="t-body" style={{ color: 'var(--color-text)' }}>{highlights?.stepWhat}</div>
            <div className="t-caption" style={help}>{highlights?.stepWhen}</div>
          </div>
        ) : null}

        {/* 전체 열람 — 접힘 기본(자기 문장 강조가 긴 목록에 묻히지 않게). 조건부 언마운트가 아니라 display 토글. */}
        {blocks.length > 0 || photos.length > 0 ? (
          <section style={{ border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-surface-1)', padding: 'var(--space-4)' }}>
            <button
              type="button"
              onClick={() => setReadOpen((o) => !o)}
              aria-expanded={readOpen}
              style={{ width: '100%', minHeight: 'var(--tap-min)', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span className="t-body" style={{ color: 'var(--color-text)' }}>적으신 것 모두 보기</span>
              <span className="t-caption" style={help}>{readOpen ? '접기 ▲' : '펼치기 ▼'}</span>
            </button>
            <div style={{ display: readOpen ? 'block' : 'none', marginTop: 'var(--space-3)' }}>
              <CheckinReadView blocks={blocks} photos={photos} />
            </div>
          </section>
        ) : null}

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <a className="ui-btn ui-btn--primary" href={`/my/cohorts/${cohortId}`} style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}>{copy.done.toHome}</a>
          {/* 상태 토글이 아니라 실제 이동이다 — 서버가 되비추기(prior)를 다시 계산해야 편집 폼이 지난 회차를
              '남아 있지 않다'고 잘못 말하지 않는다(ADR-85 §6 보존). read 는 서버 쓰기 0이라 잃을 미저장 상태가 없다. */}
          <a
            className="ui-btn ui-btn--ghost"
            href={`/my/cohorts/${cohortId}/checkin/${sessionNo}?edit=1`}
            style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}
          >
            {copy.done.edit}
          </a>
        </div>

        {/* '읽기 화면이 생겼으니 이제 못 고친다'는 오해 차단 — 마감 정책은 바뀌지 않았다(원문 인용). */}
        <div>
          {closed ? null : <div className="t-caption" style={gray}>{copy.save.notice1}</div>}
          <div className="t-caption" style={gray}>{copy.save.notice2}</div>
        </div>
      </div>
    );
  }

  const filled = copy.filledCount(answers);
  const requiredTotal = copy.requiredTotal;
  const lastStep = copy.step.lastStep;
  const share = copy.step.share;

  // 1면 슬롯 — order 가 정한 순서대로 존재하는 것만. 회차 번호로 분기하지 않는다(ADR-90).
  const t = copy.today;
  const slots = orderedSlots(copy);
  const boundaries = slotBoundaries(copy);

  // 슬롯 본문 — 모양별로 그린다. copy.today 에서 타입 그대로 꺼내므로 캐스팅이 없다.
  function renderSlot(name: SlotName): React.ReactNode {
    switch (name) {
      case 'pairText':
        return t.pairText ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
            <div style={fieldLabel}>{t.pairText.label}</div>
            <div className="t-caption" style={help}>{t.pairText.help}</div>
            <div id={fieldId(t.pairText.from.key)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className="t-caption" style={{ width: 60, flexShrink: 0, color: 'var(--color-text-secondary)' }}>{t.pairText.from.label}{isEmpty(t.pairText.from.key) ? ' · ' + EMPTY_MARK : ''}</span>
              {textInput(t.pairText.from.key, t.pairText.from.placeholder)}
            </div>
            {t.pairText.connector ? (
              <div className="t-caption" style={{ ...gray, textAlign: 'center' }}>{t.pairText.connector}</div>
            ) : null}
            <div id={fieldId(t.pairText.to.key)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className="t-caption" style={{ width: 60, flexShrink: 0, color: 'var(--color-text-secondary)' }}>{t.pairText.to.label}{isEmpty(t.pairText.to.key) ? ' · ' + EMPTY_MARK : ''}</span>
              {textInput(t.pairText.to.key, t.pairText.to.placeholder)}
            </div>
            {t.pairText.to.help ? <div className="t-caption" style={help}>{t.pairText.to.help}</div> : null}
          </div>
        ) : null;

      case 'areaPick':
        return t.areaPick ? (
          <div id={fieldId(t.areaPick.key)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
            <div style={fieldLabel}>{t.areaPick.label}{isEmpty(t.areaPick.key) ? <span className="t-caption" style={{ ...gray, marginLeft: 'var(--space-2)' }}>{EMPTY_MARK}</span> : null}</div>
            <div className="t-caption" style={help}>{t.areaPick.help}</div>
            <MultiChoiceChips
              options={[...t.areaPick.options]}
              value={str(t.areaPick.key) ? [str(t.areaPick.key)] : []}
              max={1}
              onChange={(v) => setAnswer(t.areaPick!.key, v[0] ?? '')}
              ariaLabel={t.areaPick.label}
            />
            <div id={fieldId(t.areaPick.line.key)} style={{ marginTop: 'var(--space-2)' }}>
              <div className="t-caption" style={{ ...help, marginBottom: 'var(--space-1)' }}>{t.areaPick.line.label}{isEmpty(t.areaPick.line.key) ? ' · ' + EMPTY_MARK : ''}</div>
              {textInput(t.areaPick.line.key, t.areaPick.line.placeholder)}
            </div>
          </div>
        ) : null;

      // 기본 펼침. 필수가 아님은 '선택' 뱃지가 알린다(빈 칸 셋이 펼쳐져 있으면 필수로 읽힌다).
      //   기본 펼침이라 열림 여부에 의미가 없으므로 계측하지 않는다.
      case 'purpose':
        return t.purpose ? (
          <Disclosure title={t.purpose.title} badge={t.purpose.badge} defaultOpen>
            <div className="t-caption" style={{ ...help, whiteSpace: 'pre-line', marginBottom: 'var(--space-4)' }}>{t.purpose.help}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {t.purpose.fields.map((f) => (
                <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div style={fieldLabel}>{f.label}</div>
                  {f.help ? <div className="t-caption" style={help}>{f.help}</div> : null}
                  <TextArea value={str(f.key)} onChange={(v) => setAnswer(f.key, v)} placeholder={f.placeholder} rows={2} ariaLabel={f.label} />
                </div>
              ))}
            </div>
          </Disclosure>
        ) : null;

      // 한 칸 서술. 접힘으로 감싸지 않는다 — 그 회차의 핵심 경험을 받는 자리라 눈에 보여야 한다.
      case 'question':
        return t.question ? (
          <Field label={t.question.label} helpText={t.question.help} badge={t.question.badge}>
            <TextArea value={str(t.question.key)} onChange={(v) => setAnswer(t.question!.key, v)} placeholder={t.question.placeholder} rows={3} ariaLabel={t.question.label} />
          </Field>
        ) : null;

      case 'identity':
        return t.identity ? (
          <Field label={t.identity.label} helpText={t.identity.help} fieldKey={t.identity.key} empty={isEmpty(t.identity.key)}>
            <TextArea value={str(t.identity.key)} onChange={(v) => setAnswer(t.identity!.key, v)} placeholder={t.identity.placeholder} rows={2} ariaLabel={t.identity.label} />
          </Field>
        ) : null;

      case 'mood':
        return (
          <Field label={t.mood.label} helpText={t.mood.help} fieldKey={t.mood.key} empty={isEmpty(t.mood.key)}>
            <MultiChoiceChips options={[...t.mood.options]} value={mood} max={t.mood.max} exclusive={t.mood.exclusive} onChange={(v) => setAnswer(t.mood.key, v)} ariaLabel={t.mood.label} />
            {/* 목록 한계 낱말을 고르면 직접 쓰기로 눈이 가도록 안내를 바꾼다(ADR-91 C). 강제하지 않는다. */}
            <input value={str(t.moodCustom.key)} onChange={(e) => setAnswer(t.moodCustom.key, e.target.value)} onBlur={flushSave} placeholder={moodCustomHint} aria-label={moodCustomHint} style={{ ...inputBox, marginTop: 'var(--space-2)' }} />
          </Field>
        );

      // 망라성 가드 — SlotName 에 슬롯이 늘면 여기서 컴파일이 깨진다(readModel 과 짝).
      default: {
        const _never: never = name;
        void _never;
        return null;
      }
    }
  }
  return (
    <div style={{ paddingTop: 'var(--space-2)' }}>
      {/* 표지 */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <div className="t-caption" style={{ color: 'var(--color-primary)' }}>{copy.cover.brand}</div>
        <div className="t-body-lg" style={{ color: 'var(--color-text)' }}>{copy.cover.title}</div>
        <div className="t-caption" style={help}>{copy.cover.subtitle}</div>
        <p className="t-caption" style={{ ...help, marginTop: 'var(--space-2)' }}>{copy.cover.band}</p>
        {copy.cover.firstVisitOnce && !alreadyOpened ? <p className="t-caption" style={gray}>{copy.cover.firstVisitOnce}</p> : null}
        {closed ? <p className="t-caption" style={help}>마감이 지났지만 지금 적으셔도 됩니다.</p> : null}
      </div>

      {/* 1면 · 오늘 — order 가 정한 순서대로. 슬롯 사이 경계는 group 전이가 정한다(ADR-90). */}
      {slots.map((s, i) => (
        <div key={s.name}>
          <GroupBoundary boundary={boundaries[i]} />
          <MirrorOf mirror={s.block.mirror} prior={prior} />
          {renderSlot(s.name)}
        </div>
      ))}

      {/* 1면 하단 · 심화(접힘 기본). 공용 Disclosure — 줄 전체가 버튼이고 상태를 글자로 말한다.
          접힘 블록이므로 '선택' 뱃지를 두지 않는다(ADR-82 유지 — 접혀 있다는 사실 자체가 신호). */}
      <Disclosure
        title={copy.deepen.title}
        summary={copy.deepen.summary}
        defaultOpen={initialFlags.deepOpened}
        onToggle={(open) => { if (open && !flags.deepOpened) setFlag('deepOpened', true); }}
        last
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {copy.deepen.fields.map((f) => (
            <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {/* 심화 필드에도 되비추기를 붙일 수 있다(3회차 identity_gap · ADR-90) */}
              <MirrorOf mirror={f.mirror} prior={prior} />
              <div style={fieldLabel}>{f.label}</div>
              <div className="t-caption" style={help}>{f.help}</div>
              <TextArea value={str(f.key)} onChange={(v) => setAnswer(f.key, v)} rows={f.key === 'letter_line' ? 4 : 2} ariaLabel={f.label} />
              {/* 미리보기에서는 사진 위젯을 띄우지 않는다 — 실제 Storage 를 호출하는 부품이라 서버 쓰기 0 규율을 깬다. */}
              {f.key === 'letter_line' && !preview ? <LetterPhotos cohortId={cohortId} sessionNo={sessionNo} userId={userId} /> : null}
            </div>
          ))}
        </div>
      </Disclosure>

      {/* 2면 · 한 걸음 (지난 걸음 결산 → 다음 걸음) */}
      <div style={{ paddingTop: 'var(--space-4)', borderTop: 'var(--border-hair) solid var(--color-border)' }}>
        {/* ⑤ 지난 한 걸음(2회차부터) — 위에 지난 회차 한 걸음 되비추기(없으면 대체 문구) */}
        {lastStep ? (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <MirrorOf mirror={lastStep.mirror} prior={prior} />
            <div id={fieldId(lastStep.key)} style={fieldLabel}>{lastStep.label}{isEmpty(lastStep.key) ? <span className="t-caption" style={{ ...gray, marginLeft: 'var(--space-2)' }}>{EMPTY_MARK}</span> : null}</div>
            <div style={{ marginTop: 'var(--space-2)' }}>
              <MultiChoiceChips
                options={[...lastStep.options]}
                value={str(lastStep.key) ? [str(lastStep.key)] : []}
                max={1}
                onChange={(v) => setAnswer(lastStep.key, v[0] ?? '')}
                ariaLabel={lastStep.label}
              />
            </div>
            <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={fieldLabel}>{lastStep.note.label}</div>
              <div className="t-caption" style={help}>{lastStep.note.help}</div>
              {textInput(lastStep.note.key)}
            </div>
          </div>
        ) : null}

        {/* ⑥ 다음 한 걸음 */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div className="t-body-lg" style={{ color: 'var(--color-text)' }}>{copy.step.title}</div>
          <div className="t-caption" style={{ ...help, whiteSpace: 'pre-line' }}>{copy.step.help}</div>
        </div>
      </div>
      <Field label={copy.step.what.label} fieldKey={copy.step.what.key} empty={isEmpty(copy.step.what.key)}>{textInput(copy.step.what.key)}</Field>
      <Field label={copy.step.when.label} helpText={copy.step.when.help} fieldKey={copy.step.when.key} empty={isEmpty(copy.step.when.key)}>{textInput(copy.step.when.key, copy.step.when.placeholder)}</Field>
      <Field label={copy.step.blocker.label} helpText={copy.step.blocker.help}>{textInput(copy.step.blocker.key, copy.step.blocker.placeholder)}</Field>

      {/* 한 걸음 공개 토글(2회차부터) — step_private 컬럼. 기본 해제(공개). 이유를 묻지 않는다. */}
      {share ? (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <p className="t-caption" style={{ ...help, marginBottom: 'var(--space-2)' }}>{share.notice}</p>
          <CheckRow label={share.toggleLabel} checked={flags.stepPrivate} onChange={(v) => setFlag('stepPrivate', v)} />
        </div>
      ) : null}

      {/* 3면 · 마무리 */}
      <div style={{ paddingTop: 'var(--space-4)', borderTop: 'var(--border-hair) solid var(--color-border)' }}>
        <Field label={copy.wrap.confidence.label} helpText={copy.wrap.confidence.help} fieldKey={copy.wrap.confidence.key}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {/* 미선택이면 트랙·손잡이를 흐리게(첫 조작에서 정상) — 손잡이 위치(5)와 숫자(—) 신호 불일치 완화(§3-5) */}
            <input type="range" min={0} max={10} value={confidence ?? 5} onChange={(e) => setAnswer('confidence', Number(e.target.value))} onBlur={flushSave} aria-label={copy.wrap.confidence.label} style={{ flex: 1, opacity: confidence == null ? 0.45 : 1 }} />
            <span className="t-body-lg" style={{ color: confidence == null ? 'var(--color-text-muted)' : 'var(--color-primary)', minWidth: 24, textAlign: 'center' }}>{confidence ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-1)' }}>
            <span className="t-caption" style={gray}>{copy.wrap.confidence.leftLabel}</span>
            <span className="t-caption" style={gray}>{copy.wrap.confidence.rightLabel}</span>
          </div>
        </Field>

        {/* 인도자에게(선택) — 대부분 건너뛰는 칸이라 접는다. 접힘 블록이므로 뱃지 없음.
            열림 여부는 계측하지 않는다(deep_opened 는 심화 전용). */}
        <Disclosure
          title={copy.wrap.facilitatorBox.title}
          summary={copy.wrap.facilitatorBox.summary}
          defaultOpen={copy.wrap.facilitatorBox.defaultOpen ?? false}
        >
          <Field label={copy.wrap.facilitatorBox.need.label}>{textInput('need')}</Field>
          <Field label={copy.wrap.facilitatorBox.suggestion.label}>{textInput('suggestion')}</Field>
          <CheckRow label={copy.wrap.facilitatorBox.suggestionAnon.label} checked={flags.suggestionAnon} onChange={(v) => setFlag('suggestionAnon', v)} />
          <div style={{ marginTop: 'var(--space-2)' }}>
            <CheckRow label={copy.wrap.facilitatorBox.contactRequest.label} checked={flags.contactRequest} onChange={(v) => setFlag('contactRequest', v)} />
            <div className="t-caption" style={help}>{copy.wrap.facilitatorBox.contactRequest.help}</div>
          </div>
        </Disclosure>

        {/* 마지막 칸(강조·accent) */}
        <div style={{ padding: 'var(--space-5)', background: 'var(--color-accent-soft, var(--color-surface-2))', borderRadius: 'var(--radius)', marginBottom: 'var(--space-5)' }}>
          <Field label={copy.wrap.selfNote.label} helpText={copy.wrap.selfNote.help} fieldKey={copy.wrap.selfNote.key} empty={isEmpty(copy.wrap.selfNote.key)}>
            <TextArea value={str('self_note')} onChange={(v) => setAnswer('self_note', v)} rows={2} placeholder={copy.wrap.selfNote.placeholder} ariaLabel={copy.wrap.selfNote.label} />
          </Field>
        </div>
      </div>

      {/* 제출 게이트(ADR-91) — 모달이 아니라 저장 버튼 위 인라인 패널.
          3분짜리 카드에 포커스 트랩·스크롤 락을 들이는 것은 과하고, 폰에서는 이쪽이 더 자연스럽다.
          경고색을 쓰지 않는다(참여자 화면 판정 금지). */}
      {gate ? (
        <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-surface-1)', border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius)' }}>
          <div className="t-body-lg" style={{ color: 'var(--color-text)' }}>
            {gate.labels.length > 0 ? '아직 비어 있는 칸이 있어요' : '한 가지만 더 여쭐게요'}
          </div>
          <p className="t-caption" style={{ ...help, margin: 'var(--space-1) 0 var(--space-3)' }}>
            {gate.labels.length > 0 ? '아래 칸을 채우면 갈무리가 끝납니다.' : '비워 두셔도 제출됩니다.'}
          </p>
          <ul style={{ margin: 0, paddingLeft: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {gate.labels.map((l) => <li key={l} className="t-caption" style={{ color: 'var(--color-text)' }}>{l}</li>)}
            {gate.confidenceEmpty ? (
              <li className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{copy.wrap.confidence.label} (선택)</li>
            ) : null}
          </ul>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            {gate.labels.length > 0 ? (
              <Button onClick={() => { const k = gate.keys[0]; setGate(null); if (k) goToField(k); }} style={{ flex: 1 }}>채우러 가기</Button>
            ) : (
              <Button onClick={() => { setGate(null); void doSubmit(); }} disabled={busy} style={{ flex: 1 }}>이대로 제출</Button>
            )}
            <a className="ui-btn ui-btn--ghost" href={`/my/cohorts/${cohortId}`} style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}>나중에 이어 쓰기</a>
          </div>
          {gate.confidenceEmpty && gate.labels.length > 0 ? (
            <p className="t-caption" style={{ ...gray, margin: 'var(--space-3) 0 0' }}>
              <button type="button" onClick={() => { setGate(null); goToField(copy.wrap.confidence.key); }} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' }}>
                {copy.wrap.confidence.label}
              </button>
            </p>
          ) : null}
        </div>
      ) : null}

      {/* 미리보기 고지를 저장 버튼 곁에 한 번 더 둔다 — 상단 배너는 스크롤하면 사라져,
          여기서 적은 것이 남는 줄 알고 쓰다가 잃는 일이 없게 한다(ADR-92). */}
      {preview ? (
        <p className="t-caption" style={{ ...gray, textAlign: 'center', margin: '0 0 var(--space-2)' }}>미리보기 — 저장되지 않습니다</p>
      ) : null}

      {/* 저장(단일 버튼) — 비활성으로 만들지 않는다. 눌리지 않는 버튼은 고장으로 읽힌다. */}
      <Button onClick={onSubmit} disabled={busy} style={{ width: '100%' }}>{busy ? '저장 중…' : copy.save.button}</Button>
      {filled < requiredTotal ? (
        <p className="t-caption" style={{ ...gray, textAlign: 'center', margin: 'var(--space-2) 0 0' }}>아직 {requiredTotal - filled}칸이 비어 있어요</p>
      ) : null}
      <p className="t-caption" style={{ ...help, textAlign: 'center', margin: 'var(--space-2) 0 0' }}>{copy.save.notice1}</p>
      <p className="t-caption" style={{ ...help, textAlign: 'center', margin: 0 }}>{copy.save.notice2}</p>
      {saveFailed ? (
        <p className="t-caption" style={{ ...gray, textAlign: 'center' }}>저장하지 못했습니다 · 다시 시도</p>
      ) : savedAt ? (
        <p className="t-caption" style={{ ...gray, textAlign: 'center' }}>자동 저장됨 · {savedAt}</p>
      ) : null}
    </div>
  );
}
