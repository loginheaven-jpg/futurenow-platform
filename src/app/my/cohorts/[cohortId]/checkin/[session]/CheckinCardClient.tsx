'use client';
// 회차 갈무리 카드(ADR-80·85). getCheckinSession(sessionNo)로 회차 문안을 직접 로드 — 회차번호로 분기하지 않고 '블록 존재'로 렌더.
//   copy 를 prop 으로 받지 않는다: copy 에 함수(filledCount·counter)가 있어 서버→클라 직렬화가 깨진다(레지스트리는 순수 모듈이라 클라 import 가능).
//   자동저장(디바운스 2s/blur)·단일버튼(save→submit)·완료상태. 판정·경고색 없음(참여자 화면). '설문·진단·지각·미제출·워크북' 미사용.
//   되비추기(prior): 지난 회차 답을 읽기전용 회색으로 되비춘다(§6). 공유 동의 UI 없음(나눔 동의는 인도자 개별 대면 — C2-d).
import { useEffect, useRef, useState } from 'react';
import { Button, CheckRow, MultiChoiceChips, TextArea } from '@/core/ui';
import { getCheckinSession } from '@/instruments/futurenow/checkin';
import { markCheckinOpenedAction, saveCheckinAction, submitCheckinAction } from './actions';
import { LetterPhotos } from './LetterPhotos';

type Flags = { suggestionAnon: boolean; contactRequest: boolean; deepOpened: boolean; stepPrivate: boolean };
// 되비추기 재료 — page 가 getMyCheckin(sessionNo-1)에서 뽑아 넘긴다(§6). 없으면 null.
type PriorMirror = { identity: string | null; stepWhat: string | null; stepWhen: string | null };

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

function Field({ label, helpText, children }: { label: string; helpText?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
      <div style={fieldLabel}>{label}</div>
      {helpText ? <div className="t-caption" style={help}>{helpText}</div> : null}
      {children}
    </div>
  );
}

// 되비추기 — 읽기전용 회색(테두리 없음, 입력칸으로 오해 방지 · §6). 기울임 없음.
function Mirror({ caption, value }: { caption: string; value: string }) {
  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <div className="t-caption" style={gray}>{caption}</div>
      <div className="t-body" style={{ color: 'var(--color-text-secondary)' }}>{value}</div>
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
  submitted,
  closed,
  prior,
}: {
  cohortId: string;
  sessionNo: number;
  userId: string;
  initialAnswers: Record<string, unknown>;
  initialFlags: Flags;
  alreadyOpened: boolean;
  submitted: boolean;
  closed: boolean;
  prior: PriorMirror | null;
}) {
  const copy = getCheckinSession(sessionNo); // 순수 모듈 — 클라 import 안전(직렬화 경계 넘지 않음)
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [flags, setFlags] = useState<Flags>(initialFlags);
  const [mode, setMode] = useState<'edit' | 'done'>(submitted ? 'done' : 'edit');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deepOpen, setDeepOpen] = useState(initialFlags.deepOpened);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 최초 진입 표식(계측) — 1회.
  useEffect(() => {
    if (!alreadyOpened) void markCheckinOpenedAction(cohortId, sessionNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const str = (k: string) => (typeof answers[k] === 'string' ? (answers[k] as string) : '');
  const mood = Array.isArray(answers.mood) ? (answers.mood as string[]) : [];
  const confidence = typeof answers.confidence === 'number' ? (answers.confidence as number) : null;

  function scheduleSave(nextAnswers: Record<string, unknown>, nextFlags: Flags) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void doSave(nextAnswers, nextFlags), 2000);
  }
  async function doSave(a: Record<string, unknown>, f: Flags) {
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

  async function onSubmit() {
    setBusy(true);
    if (timer.current) clearTimeout(timer.current);
    const res = await submitCheckinAction(cohortId, sessionNo, answers, flags); // R2: save→submit 한 액션 내 순차
    setBusy(false);
    if (res.ok) setMode('done');
    else setSaveFailed(true);
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

  if (mode === 'done') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', paddingTop: 'var(--space-4)' }}>
        <div className="t-body-lg" style={{ color: 'var(--color-text)' }}>{copy.done.title}</div>
        <div style={{ padding: 'var(--space-5)', background: 'var(--color-accent-soft, var(--color-surface-2))', border: 'var(--border-hair) solid var(--color-accent)', borderRadius: 'var(--radius)' }}>
          <div className="t-h2" style={{ color: 'var(--color-primary)', margin: 0 }}>“{str('self_note')}”</div>
        </div>
        <div>
          <div className="t-caption" style={help}>{copy.done.stepHeading}</div>
          <div className="t-body" style={{ color: 'var(--color-text)' }}>{str('step_what')}</div>
          <div className="t-caption" style={help}>{str('step_when')}</div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <a className="ui-btn ui-btn--primary" href={`/my/cohorts/${cohortId}`} style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}>{copy.done.toHome}</a>
          <Button variant="ghost" onClick={() => setMode('edit')} style={{ flex: 1 }}>{copy.done.edit}</Button>
        </div>
      </div>
    );
  }

  const filled = copy.filledCount(answers);
  const requiredTotal = copy.requiredTotal;
  const desire = copy.today.desire;
  const futureArea = copy.today.futureArea;
  const identity = copy.today.identity;
  const lastStep = copy.step.lastStep;
  const share = copy.step.share;
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

      {/* 1면 · 오늘 — ① 바꿔 쓴 문장 한 쌍(1회차) */}
      {desire ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
          <div style={fieldLabel}>{desire.label}</div>
          <div className="t-caption" style={help}>{desire.help}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className="t-caption" style={{ width: 60, flexShrink: 0, color: 'var(--color-text-secondary)' }}>{desire.from.label}</span>
            {textInput(desire.from.key, desire.from.placeholder)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className="t-caption" style={{ width: 60, flexShrink: 0, color: 'var(--color-text-secondary)' }}>{desire.to.label}</span>
            {textInput(desire.to.key, desire.to.placeholder)}
          </div>
        </div>
      ) : null}

      {/* ① 가장 가슴 뛴 영역(2회차) — 칩 단일선택(문자열 저장) + 한 문장 */}
      {futureArea ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
          <div style={fieldLabel}>{futureArea.label}</div>
          <div className="t-caption" style={help}>{futureArea.help}</div>
          <MultiChoiceChips
            options={[...futureArea.options]}
            value={str(futureArea.key) ? [str(futureArea.key)] : []}
            max={1}
            onChange={(v) => setAnswer(futureArea.key, v[0] ?? '')}
            ariaLabel={futureArea.label}
          />
          <div style={{ marginTop: 'var(--space-2)' }}>
            <div className="t-caption" style={{ ...help, marginBottom: 'var(--space-1)' }}>{futureArea.line.label}</div>
            {textInput(futureArea.line.key, futureArea.line.placeholder)}
          </div>
        </div>
      ) : null}

      {/* ② 정체성 문장 — 위에 지난 회차 문장 되비추기(mirror·prior 있을 때만) */}
      {identity.mirror && prior?.identity ? <Mirror caption="지난 시간에 쓰신 문장" value={prior.identity} /> : null}
      <Field label={identity.label} helpText={identity.help}>
        <TextArea value={str(identity.key)} onChange={(v) => setAnswer(identity.key, v)} placeholder={identity.placeholder} rows={2} ariaLabel={identity.label} />
      </Field>

      {/* ③ 오늘의 마음 */}
      <Field label={copy.today.mood.label} helpText={copy.today.mood.help}>
        <MultiChoiceChips options={[...copy.today.mood.options]} value={mood} max={copy.today.mood.max} exclusive={copy.today.mood.exclusive} onChange={(v) => setAnswer('mood', v)} ariaLabel={copy.today.mood.label} />
        <input value={str('mood_custom')} onChange={(e) => setAnswer('mood_custom', e.target.value)} onBlur={flushSave} placeholder={copy.today.moodCustom.placeholder} aria-label={copy.today.moodCustom.placeholder} style={{ ...inputBox, marginTop: 'var(--space-2)' }} />
      </Field>

      {/* 1면 하단 · 심화(접힘 기본 · 제목 클릭으로 펼침) */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        {/* 펼침 컨트롤 — 테두리 박스 + 큰 화살표로 클릭 유도 */}
        <button
          type="button"
          onClick={() => { const n = !deepOpen; setDeepOpen(n); if (n && !flags.deepOpened) setFlag('deepOpened', true); }}
          aria-expanded={deepOpen}
          style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 'var(--space-1)', padding: 'var(--space-3) var(--space-4)', border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-surface-1)', cursor: 'pointer', textAlign: 'left' }}
        >
          <span className="t-body-lg" style={{ color: 'var(--color-primary)' }}>{copy.deepen.title}</span>
          {/* 우측방향 화살표 — 텍스트 바로 옆·두껍게(펼침 유도) */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)', flexShrink: 0 }} aria-hidden="true">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
        {deepOpen ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
            {copy.deepen.fields.map((f) => (
              <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={fieldLabel}>{f.label}</div>
                <div className="t-caption" style={help}>{f.help}</div>
                <TextArea value={str(f.key)} onChange={(v) => setAnswer(f.key, v)} rows={f.key === 'letter_line' ? 4 : 2} ariaLabel={f.label} />
                {f.key === 'letter_line' ? <LetterPhotos cohortId={cohortId} sessionNo={sessionNo} userId={userId} /> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* 2면 · 한 걸음 (지난 걸음 결산 → 다음 걸음) */}
      <div style={{ paddingTop: 'var(--space-4)', borderTop: 'var(--border-hair) solid var(--color-border)' }}>
        {/* ⑤ 지난 한 걸음(2회차부터) — 위에 지난 회차 한 걸음 되비추기(없으면 대체 문구) */}
        {lastStep ? (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            {prior?.stepWhat
              ? <Mirror caption="지난 시간의 한 걸음" value={prior.stepWhen ? `${prior.stepWhat} · ${prior.stepWhen}` : prior.stepWhat} />
              : <p className="t-caption" style={{ ...help, marginBottom: 'var(--space-3)' }}>{lastStep.mirrorEmpty}</p>}
            <div style={fieldLabel}>{lastStep.label}</div>
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
      <Field label={copy.step.what.label}>{textInput(copy.step.what.key)}</Field>
      <Field label={copy.step.when.label} helpText={copy.step.when.help}>{textInput(copy.step.when.key, copy.step.when.placeholder)}</Field>
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
        <Field label={copy.wrap.confidence.label} helpText={copy.wrap.confidence.help}>
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

        {/* 인도자에게(선택) */}
        <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface-1)', border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius)', marginBottom: 'var(--space-5)' }}>
          <div className="t-caption" style={{ ...help, marginBottom: 'var(--space-3)' }}>{copy.wrap.facilitatorBox.title}</div>
          <Field label={copy.wrap.facilitatorBox.need.label}>{textInput('need')}</Field>
          <Field label={copy.wrap.facilitatorBox.suggestion.label}>{textInput('suggestion')}</Field>
          <CheckRow label={copy.wrap.facilitatorBox.suggestionAnon.label} checked={flags.suggestionAnon} onChange={(v) => setFlag('suggestionAnon', v)} />
          <div style={{ marginTop: 'var(--space-2)' }}>
            <CheckRow label={copy.wrap.facilitatorBox.contactRequest.label} checked={flags.contactRequest} onChange={(v) => setFlag('contactRequest', v)} />
            <div className="t-caption" style={help}>{copy.wrap.facilitatorBox.contactRequest.help}</div>
          </div>
        </div>

        {/* 마지막 칸(강조·accent) */}
        <div style={{ padding: 'var(--space-5)', background: 'var(--color-accent-soft, var(--color-surface-2))', borderRadius: 'var(--radius)', marginBottom: 'var(--space-5)' }}>
          <Field label={copy.wrap.selfNote.label} helpText={copy.wrap.selfNote.help}>
            <TextArea value={str('self_note')} onChange={(v) => setAnswer('self_note', v)} rows={2} placeholder={copy.wrap.selfNote.placeholder} ariaLabel={copy.wrap.selfNote.label} />
          </Field>
        </div>
      </div>

      {/* 저장(단일 버튼) — 필수 미충족이어도 막지 않는다(소프트). 남은 필수 칸만 조용히 안내. */}
      <Button onClick={onSubmit} disabled={busy} style={{ width: '100%' }}>{busy ? '저장 중…' : copy.save.button}</Button>
      {filled < requiredTotal ? (
        <p className="t-caption" style={{ ...gray, textAlign: 'center', margin: 'var(--space-2) 0 0' }}>필수 {requiredTotal - filled}칸 남음</p>
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
