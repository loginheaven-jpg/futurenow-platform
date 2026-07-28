'use client';
// 회차별 갈무리 직접 링크(ADR-81 QR 짧은 경로 재사용). 코치가 복사해 카톡 등으로 배포 → 멤버가 그 회차 갈무리로 직행.
//   링크 = {origin}/c/{code}/{session} — 미인증→로그인 후 복귀·비멤버→참여·멤버→카드(QR 경로가 처리).
import { useState } from 'react';
import { Button } from '@/core/ui';
import type { CohortSession } from '@/contracts';

export function SessionLinks({ code, sessions }: { code: string; sessions: CohortSession[] }) {
  const [copied, setCopied] = useState<number | null>(null);

  async function copy(n: number) {
    const url = `${window.location.origin}/c/${code}/${n}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(n);
      setTimeout(() => setCopied((c) => (c === n ? null : c)), 1500);
    } catch {
      // 클립보드 권한 없으면 무시(사용자가 길게 눌러 복사).
    }
  }

  return (
    <section style={{ marginBottom: 'var(--space-6)' }}>
      <h2 className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 16, margin: '0 0 var(--space-1)' }}>회차별 갈무리 링크</h2>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
        복사해 카톡 등으로 보내면, 멤버가 바로 그 회차 갈무리로 들어갑니다.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {sessions.map((s) => (
          <div key={s.sessionNo} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className="t-body" style={{ flex: 1, color: 'var(--color-text)' }}>{s.sessionNo}회차 갈무리</span>
            <Button variant="ghost" onClick={() => copy(s.sessionNo)}>{copied === s.sessionNo ? '복사됨 ✓' : '링크 복사'}</Button>
          </div>
        ))}
      </div>
    </section>
  );
}
