'use client';
// 회기 홈 최하단 '지난 회차' 접힌 줄(ADR-86). 지금까지 링크가 아예 없어 지난 갈무리를 볼 길이 없었다.
//   시각 위계 3단(ADR-81)의 최하위를 유지한다 — 캡션 타이포·muted 색 그대로, 카드·버튼·테두리 없음.
//   서버 왕복 0: 회차 번호만 받아 링크를 만든다(회차별 getMyCheckin 을 부르지 않는다).
import Link from 'next/link';
import { useState } from 'react';

export function PastSessionsClient({ cohortId, sessionNos, label }: { cohortId: string; sessionNos: number[]; label: string }) {
  const [open, setOpen] = useState(false);
  if (sessionNos.length === 0) return null;

  return (
    <div style={{ padding: 'var(--space-2) var(--space-1)' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ width: '100%', minHeight: 'var(--tap-min)', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span className="t-caption" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <span className="t-caption" style={{ color: 'var(--color-text-muted)' }}>{open ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>

      <div style={{ display: open ? 'block' : 'none' }}>
        {sessionNos.map((n) => (
          <Link
            key={n}
            href={`/my/cohorts/${cohortId}/checkin/${n}`}
            className="t-caption"
            style={{ display: 'flex', minHeight: 'var(--tap-min)', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text-muted)', textDecoration: 'none', paddingLeft: 'var(--space-3)' }}
          >
            <span>{n}회차</span>
            <span aria-hidden>›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
