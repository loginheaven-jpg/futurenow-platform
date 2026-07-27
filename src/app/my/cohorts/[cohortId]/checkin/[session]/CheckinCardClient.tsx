'use client';
// 회차 갈무리 카드 클라이언트(ADR-80 · 문안 v2). 자동 저장(디바운스 2s/blur)·단일 버튼(save→submit)·완료 상태.
//   판정·경고색 없음(참여자 화면). '설문·진단·지각·미제출·워크북' 미사용('이건 진단이 아닙니다'는 지정 예외).
//   공유 동의 UI 없음(나눔 동의는 인도자 개별 대면 — C2-d). 이탈 경고(beforeunload) 없음.
import { useEffect, useRef, useState } from 'react';
import { Button, CheckRow, MultiChoiceChips, TextArea } from '@/core/ui';
import { CHECKIN_SESSION_1, CHECKIN_REQUIRED_TOTAL, checkinFilledCount } from '@/instruments/futurenow/checkin/session1';
import { markCheckinOpenedAction, saveCheckinAction, submitCheckinAction } from './actions';

const copy = CHECKIN_SESSION_1;
type Flags = { suggestionAnon: boolean; contactRequest: boolean; deepOpened: boolean };

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

export function CheckinCardClient({
  cohortId,
  sessionNo,
  initialAnswers,
  initialFlags,
  alreadyOpened,
  submitted,
  closed,
}: {
  cohortId: string;
  sessionNo: number;
  initialAnswers: Record<string, unknown>;
  initialFlags: Flags;
  alreadyOpened: boolean;
  submitted: boolean;
  closed: boolean;
}) {
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

  const filled = checkinFilledCount(answers);
  const d = copy.today.desire;
  return (
    <div style={{ paddingTop: 'var(--space-2)' }}>
      {/* 표지 */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <div className="t-caption" style={{ color: 'var(--color-primary)' }}>{copy.cover.brand}</div>
        <div className="t-body-lg" style={{ color: 'var(--color-text)' }}>{copy.cover.title}</div>
        <div className="t-caption" style={help}>{copy.cover.subtitle}</div>
        <div className="t-caption" style={gray}>{copy.cover.counter(filled)}</div>
        <p className="t-caption" style={{ ...help, marginTop: 'var(--space-2)' }}>{copy.cover.band}</p>
        {!alreadyOpened ? <p className="t-caption" style={gray}>{copy.cover.firstVisitOnce}</p> : null}
        {closed ? <p className="t-caption" style={help}>마감이 지났지만 지금 적으셔도 됩니다.</p> : null}
      </div>

      {/* 1면 · 오늘 — ① 바꿔 쓴 문장 한 쌍 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
        <div style={fieldLabel}>{d.label}</div>
        <div className="t-caption" style={help}>{d.help}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span className="t-caption" style={{ width: 60, flexShrink: 0, color: 'var(--color-text-secondary)' }}>{d.from.label}</span>
          {textInput(d.from.key, d.from.placeholder)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span className="t-caption" style={{ width: 60, flexShrink: 0, color: 'var(--color-text-secondary)' }}>{d.to.label}</span>
          {textInput(d.to.key, d.to.placeholder)}
        </div>
      </div>

      {/* ② 존재가치 선언문 */}
      <Field label={copy.today.identitySentence.label} helpText={copy.today.identitySentence.help}>
        <TextArea value={str('identity_sentence')} onChange={(v) => setAnswer('identity_sentence', v)} placeholder={copy.today.identitySentence.placeholder} rows={2} ariaLabel={copy.today.identitySentence.label} />
      </Field>

      {/* ③ 오늘의 마음 */}
      <Field label={copy.today.mood.label} helpText={copy.today.mood.help}>
        <MultiChoiceChips options={[...copy.today.mood.options]} value={mood} max={copy.today.mood.max} exclusive={copy.today.mood.exclusive} onChange={(v) => setAnswer('mood', v)} ariaLabel={copy.today.mood.label} />
        <input value={str('mood_custom')} onChange={(e) => setAnswer('mood_custom', e.target.value)} onBlur={flushSave} placeholder={copy.today.moodCustom.placeholder} aria-label={copy.today.moodCustom.placeholder} style={{ ...inputBox, marginTop: 'var(--space-2)' }} />
      </Field>

      {/* 1면 하단 · 심화(접힘 기본 · 제목 클릭으로 펼침) */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <button type="button" onClick={() => { const n = !deepOpen; setDeepOpen(n); if (n && !flags.deepOpened) setFlag('deepOpened', true); }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }} aria-expanded={deepOpen}>
          <span className="t-body-lg" style={{ color: 'var(--color-primary)' }}>{copy.deepen.title}</span>
          <span aria-hidden className="t-caption" style={gray}>{deepOpen ? '▾' : '▸'}</span>
        </button>
        {deepOpen ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
            {copy.deepen.fields.map((f) => (
              <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={fieldLabel}>{f.label}</div>
                <div className="t-caption" style={help}>{f.help}</div>
                <TextArea value={str(f.key)} onChange={(v) => setAnswer(f.key, v)} rows={f.key === 'letter_line' ? 4 : 2} ariaLabel={f.label} />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* 2면 · 한 걸음 */}
      <div style={{ marginBottom: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: 'var(--border-hair) solid var(--color-border)' }}>
        <div className="t-body-lg" style={{ color: 'var(--color-text)' }}>{copy.step.title}</div>
        <div className="t-caption" style={{ ...help, whiteSpace: 'pre-line' }}>{copy.step.help}</div>
      </div>
      <Field label={copy.step.what.label}>{textInput('step_what')}</Field>
      <Field label={copy.step.when.label} helpText={copy.step.when.help}>{textInput('step_when', copy.step.when.placeholder)}</Field>
      <Field label={copy.step.blocker.label} helpText={copy.step.blocker.help}>{textInput('step_blocker', copy.step.blocker.placeholder)}</Field>

      {/* 3면 · 마무리 */}
      <div style={{ paddingTop: 'var(--space-4)', borderTop: 'var(--border-hair) solid var(--color-border)' }}>
        <Field label={copy.wrap.confidence.label} helpText={copy.wrap.confidence.help}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <input type="range" min={0} max={10} value={confidence ?? 5} onChange={(e) => setAnswer('confidence', Number(e.target.value))} onBlur={flushSave} aria-label={copy.wrap.confidence.label} style={{ flex: 1 }} />
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
      {filled < CHECKIN_REQUIRED_TOTAL ? (
        <p className="t-caption" style={{ ...gray, textAlign: 'center', margin: 'var(--space-2) 0 0' }}>필수 {CHECKIN_REQUIRED_TOTAL - filled}칸 남음</p>
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
