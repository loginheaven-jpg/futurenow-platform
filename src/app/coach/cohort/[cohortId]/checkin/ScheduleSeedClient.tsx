'use client';
// 회차 일정(ADR-80·82·83). 미등록이면 시작일 하나로 7행 seed, 등록돼 있으면 날짜 편집 + 회차별 링크 복사.
//   개최=열림을 한 칸('날짜')으로 합침(중복 제거) — 저장 시 opens_at = held_at 로 자동. 마감은 별도.
//   각 행 우측에 링크 복사 아이콘 = /c/{code}/{session}(QR 짧은 경로) → 카톡 배포.
import Link from 'next/link';
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
// 날짜(로컬) → ISO. 앵커: 개최/열림 10:00·00:00 · 마감 23:59(하루 단위 게이트).
function fromDateInput(dateStr: string, anchor: 'held' | 'opens' | 'closes'): string {
  const t = anchor === 'held' ? 'T10:00' : anchor === 'opens' ? 'T00:00' : 'T23:59';
  return new Date(`${dateStr}${t}`).toISOString();
}

type Row = { sessionNo: number; date: string; closes: string };

const dateInput = {
  minHeight: 'var(--tap-min)',
  padding: '0 var(--space-2)',
  borderRadius: 'var(--radius)',
  border: 'var(--border-hair) solid var(--color-border)',
  background: 'var(--color-surface-1)',
  color: 'var(--color-text)',
  font: 'inherit',
  fontSize: 13,
  width: '100%',
} as const;
const linkBtn = {
  width: 'var(--tap-min)',
  height: 'var(--tap-min)',
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--color-surface-1)',
  border: 'var(--border-hair) solid var(--color-border)',
  borderRadius: 'var(--radius)',
  color: 'var(--color-primary)',
  cursor: 'pointer',
} as const;

function LinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function ScheduleSeedClient({ cohortId, code, sessions }: { cohortId: string; code: string; sessions: CohortSession[] }) {
  const router = useRouter();
  const hasSchedule = sessions.length > 0;

  const [date, setDate] = useState('');
  const [rows, setRows] = useState<Row[]>(
    sessions.map((s) => ({ sessionNo: s.sessionNo, date: toDateInput(s.heldAt), closes: toDateInput(s.closesAt) })),
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  async function onSeed() {
    if (!date) return;
    setBusy(true); setErr(null); setMsg(null);
    // finally 가 없으면 액션이 throw 할 때 버튼이 영구히 잠긴다(성능 감사 2026-08-25).
    let res;
    try {
      res = await seedSessionsAction(cohortId, new Date(`${date}T10:00`).toISOString());
    } finally {
      setBusy(false);
    }
    if (!res.ok) { setErr('일정 생성에 실패했어요.'); return; }
    if ((res.inserted ?? 0) === 0) setMsg('이미 등록된 일정이 있어 아무것도 바뀌지 않았습니다. 아래에서 회차별로 수정해 주세요.');
    router.refresh();
  }

  function setRow(i: number, k: 'date' | 'closes', v: string) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
    setMsg(null);
  }

  async function onSave() {
    setBusy(true); setErr(null); setMsg(null);
    // 개최=열림: opens_at 을 date 와 같은 날로. 마감은 closes.
    const payload: CohortSession[] = rows.map((r) => ({
      cohortId,
      sessionNo: r.sessionNo,
      heldAt: fromDateInput(r.date, 'held'),
      opensAt: fromDateInput(r.date, 'opens'),
      closesAt: fromDateInput(r.closes, 'closes'),
    }));
    let res;
    try {
      res = await saveScheduleAction(cohortId, payload);
    } finally {
      setBusy(false);
    }
    if (res.ok) { setMsg('저장했어요.'); router.refresh(); }
    else setErr('일정 저장에 실패했어요.');
  }

  async function copyLink(n: number) {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/c/${code}/${n}`);
      setCopied(n);
      setTimeout(() => setCopied((c) => (c === n ? null : c)), 1500);
    } catch {
      /* 클립보드 권한 없으면 무시 */
    }
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

  const grid = { display: 'grid', gridTemplateColumns: '46px 1fr 1fr var(--tap-min) var(--tap-min)', gap: 'var(--space-2)', alignItems: 'center' } as const;
  return (
    <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius)', marginBottom: 'var(--space-5)', background: 'var(--color-surface-1)', border: 'var(--border-hair) solid var(--color-border)' }}>
      <div className="t-caption" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>회차 일정 · 날짜 / 마감 / 링크</div>
      <div style={{ ...grid, padding: '0 2px var(--space-2)' }}>
        <span className="t-caption" style={{ color: 'var(--color-text-muted)' }}>회차</span>
        <span className="t-caption" style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>날짜</span>
        <span className="t-caption" style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>마감</span>
        <span className="t-caption" style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>링크</span>
        <span className="t-caption" style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>미리</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {rows.map((r, i) => (
          <div key={r.sessionNo} style={grid}>
            <span className="t-caption" style={{ color: 'var(--color-text)' }}>{r.sessionNo}회차</span>
            <input type="date" value={r.date} onChange={(e) => setRow(i, 'date', e.target.value)} aria-label={`${r.sessionNo}회차 날짜`} style={dateInput} />
            <input type="date" value={r.closes} onChange={(e) => setRow(i, 'closes', e.target.value)} aria-label={`${r.sessionNo}회차 마감`} style={dateInput} />
            <button type="button" onClick={() => copyLink(r.sessionNo)} disabled={!code} aria-label={`${r.sessionNo}회차 갈무리 링크 복사`} title="갈무리 링크 복사" style={linkBtn}>
              {copied === r.sessionNo ? <span className="t-caption" style={{ color: 'var(--color-primary)' }}>✓</span> : <LinkIcon />}
            </button>
            {/* 미리보기(ADR-92) — 아직 열리지 않은 회차도 여기서 본다. 카드 라우트는 opens_at 게이트가 막는다. */}
            <Link
              href={`/coach/cohort/${cohortId}/checkin/preview?session=${r.sessionNo}`}
              aria-label={`${r.sessionNo}회차 갈무리 카드 미리보기`}
              title="갈무리 카드 미리보기"
              style={{ ...linkBtn, textDecoration: 'none' }}
            >
              <EyeIcon />
            </Link>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
        <Button onClick={onSave} disabled={busy}>{busy ? '저장 중…' : '일정 저장'}</Button>
        {msg ? <span className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{msg}</span> : null}
        {err ? <span className="t-caption" style={{ color: 'var(--color-danger)' }}>{err}</span> : null}
      </div>
      <p className="t-caption" style={{ color: 'var(--color-text-muted)', margin: 'var(--space-2) 0 0' }}>
        링크를 복사해 카톡 등으로 보내면 멤버가 바로 그 회차 갈무리로 들어갑니다. (열림 시각은 날짜와 같은 날로 저장돼요)
      </p>
    </div>
  );
}
