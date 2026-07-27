'use client';
// 회차 일정(ADR-80 · Phase 7). 미등록이면 시작일 하나로 7행 생성(seed), 등록돼 있으면 개별 날짜 표시·수정(upsert).
//   미등록은 정상 상태지만 조치 항목으로 상단 경고. 저장 후 화면에 날짜가 그대로 보인다.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/core/ui';
import type { CohortSession } from '@/contracts';
import { saveScheduleAction, seedSessionsAction } from './actions';

const p2 = (n: number) => String(n).padStart(2, '0');
function toDateInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
// 날짜(로컬) → ISO. 앵커 시각: 개최 10:00 · 열림 00:00 · 마감 23:59(하루 단위 게이트).
function fromDateInput(dateStr: string, anchor: 'held' | 'opens' | 'closes'): string {
  const t = anchor === 'held' ? 'T10:00' : anchor === 'opens' ? 'T00:00' : 'T23:59';
  return new Date(`${dateStr}${t}`).toISOString();
}

type Row = { sessionNo: number; held: string; opens: string; closes: string };

const dateInput = {
  minHeight: 'var(--tap-min)',
  padding: '0 var(--space-2)',
  borderRadius: 'var(--radius)',
  border: 'var(--border-hair) solid var(--color-border)',
  font: 'inherit',
  fontSize: 13,
} as const;

export function ScheduleSeedClient({ cohortId, sessions }: { cohortId: string; sessions: CohortSession[] }) {
  const router = useRouter();
  const hasSchedule = sessions.length > 0;

  // seed(미등록)
  const [date, setDate] = useState('');
  // edit(등록됨)
  const [rows, setRows] = useState<Row[]>(
    sessions.map((s) => ({ sessionNo: s.sessionNo, held: toDateInput(s.heldAt), opens: toDateInput(s.opensAt), closes: toDateInput(s.closesAt) })),
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSeed() {
    if (!date) return;
    setBusy(true); setErr(null); setMsg(null);
    const res = await seedSessionsAction(cohortId, new Date(`${date}T10:00`).toISOString());
    setBusy(false);
    if (!res.ok) { setErr('일정 생성에 실패했어요.'); return; }
    const n = res.inserted ?? 0;
    // 0 = 이미 있음(레이스 등) → 편집기로 유도. 1~7 = 생성됨 → refresh 시 아래 편집기가 실제 날짜로 확인.
    if (n === 0) { setMsg('이미 등록된 일정이 있어 아무것도 바뀌지 않았습니다. 아래에서 회차별로 수정해 주세요.'); router.refresh(); return; }
    router.refresh();
  }

  function setRow(i: number, k: 'held' | 'opens' | 'closes', v: string) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
    setMsg(null);
  }

  async function onSave() {
    setBusy(true); setErr(null); setMsg(null);
    const payload: CohortSession[] = rows.map((r) => ({
      cohortId,
      sessionNo: r.sessionNo,
      heldAt: fromDateInput(r.held, 'held'),
      opensAt: fromDateInput(r.opens, 'opens'),
      closesAt: fromDateInput(r.closes, 'closes'),
    }));
    const res = await saveScheduleAction(cohortId, payload);
    setBusy(false);
    if (res.ok) { setMsg('저장했어요.'); router.refresh(); }
    else setErr('일정 저장에 실패했어요.');
  }

  if (!hasSchedule) {
    return (
      <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius)', marginBottom: 'var(--space-5)', background: 'var(--color-warning-soft, var(--color-surface-2))', border: 'var(--border-hair) solid var(--color-warning, var(--color-accent))' }}>
        <p className="t-caption" style={{ color: 'var(--color-warning, var(--color-text))', margin: '0 0 var(--space-3)' }}>
          참여자 화면에 갈무리가 열리지 않습니다. 1회차 시작일을 넣어 회차 일정을 등록해 주세요.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="1회차 시작일" style={{ ...dateInput, flex: 1, fontSize: 15 }} />
          <Button onClick={onSeed} disabled={busy || !date}>{busy ? '생성 중…' : '일정 등록'}</Button>
        </div>
        {msg ? <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0 0' }}>{msg}</p> : null}
        {err ? <p className="t-caption" style={{ color: 'var(--color-danger)', margin: 'var(--space-2) 0 0' }}>{err}</p> : null}
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius)', marginBottom: 'var(--space-5)', background: 'var(--color-surface-1)', border: 'var(--border-hair) solid var(--color-border)' }}>
      <div className="t-caption" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>회차 일정 · 개최 / 열림 / 마감</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {rows.map((r, i) => (
          <div key={r.sessionNo} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className="t-caption" style={{ width: 44, flexShrink: 0, color: 'var(--color-text)' }}>{r.sessionNo}회차</span>
            <input type="date" value={r.held} onChange={(e) => setRow(i, 'held', e.target.value)} aria-label={`${r.sessionNo}회차 개최일`} style={{ ...dateInput, flex: 1 }} />
            <input type="date" value={r.opens} onChange={(e) => setRow(i, 'opens', e.target.value)} aria-label={`${r.sessionNo}회차 열림`} style={{ ...dateInput, flex: 1 }} />
            <input type="date" value={r.closes} onChange={(e) => setRow(i, 'closes', e.target.value)} aria-label={`${r.sessionNo}회차 마감`} style={{ ...dateInput, flex: 1 }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
        <Button onClick={onSave} disabled={busy}>{busy ? '저장 중…' : '일정 저장'}</Button>
        {msg ? <span className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{msg}</span> : null}
        {err ? <span className="t-caption" style={{ color: 'var(--color-danger)' }}>{err}</span> : null}
      </div>
    </div>
  );
}
