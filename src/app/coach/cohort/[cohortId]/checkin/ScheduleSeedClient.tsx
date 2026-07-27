'use client';
// 회차 일정 등록(ADR-80 · Phase 7). 시작일 하나 → seedSessionsAction → 7행 생성. 미등록이면 조치 항목으로 상단 노출.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/core/ui';
import { seedSessionsAction } from './actions';

export function ScheduleSeedClient({ cohortId, hasSchedule }: { cohortId: string; hasSchedule: boolean }) {
  const router = useRouter();
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSeed() {
    if (!date) return;
    setBusy(true);
    setErr(null);
    // 로컬 날짜 → ISO(그 날 오전으로). 개별 행 시각은 이후 조정.
    const res = await seedSessionsAction(cohortId, new Date(`${date}T10:00`).toISOString());
    setBusy(false);
    if (res.ok) router.refresh();
    else setErr('일정 생성에 실패했어요.');
  }

  return (
    <div
      style={{
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius)',
        marginBottom: 'var(--space-5)',
        background: hasSchedule ? 'var(--color-surface-1)' : 'var(--color-warning-soft, var(--color-surface-2))',
        border: `var(--border-hair) solid ${hasSchedule ? 'var(--color-border)' : 'var(--color-warning, var(--color-accent))'}`,
      }}
    >
      {!hasSchedule ? (
        <p className="t-caption" style={{ color: 'var(--color-warning, var(--color-text))', margin: '0 0 var(--space-3)' }}>
          참여자 화면에 갈무리가 열리지 않습니다. 회차 일정을 먼저 등록해 주세요.
        </p>
      ) : (
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
          1회차 시작일을 다시 넣으면 빠진 회차만 채워집니다(기존 회차는 보존).
        </p>
      )}
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="1회차 시작일" style={{ flex: 1, minHeight: 'var(--tap-min)', padding: '0 var(--space-3)', borderRadius: 'var(--radius)', border: 'var(--border-hair) solid var(--color-border)', font: 'inherit' }} />
        <Button onClick={onSeed} disabled={busy || !date}>{busy ? '생성 중…' : '일정 등록'}</Button>
      </div>
      {err ? <p className="t-caption" style={{ color: 'var(--color-danger)', margin: 'var(--space-2) 0 0' }}>{err}</p> : null}
    </div>
  );
}
