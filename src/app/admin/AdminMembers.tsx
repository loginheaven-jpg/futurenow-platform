'use client';
// 본부 멤버 관리(프레젠테이션 — 부수효과 없음). 운영자 화면(§8.6 첫 조각). 의미색 허용(참여자 화면 아님).
// user→[코치로 승격], coach→[멤버로 강등]. 본인(운영자) 행은 강등 미제공(자기강등 가드의 UI 반영).
import { Button } from '@/core/ui';
import type { MemberSummary } from '@/contracts';

const ROLE_LABEL: Record<string, string> = { admin: '운영자', coach: '코치', user: '멤버' };

export function AdminMembers({
  members,
  currentUserId,
  busyId,
  onPromote,
  onDemote,
}: {
  members: MemberSummary[];
  currentUserId: string;
  busyId?: string | null;
  onPromote: (id: string) => void;
  onDemote: (id: string) => void;
}) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <h1 className="t-h1" style={{ color: 'var(--color-primary)', fontSize: 22, margin: '0 0 var(--space-2)' }}>본부 · 멤버 관리</h1>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-6)' }}>
        멤버를 코치로 승격하거나 되돌릴 수 있어요. 운영자 전용입니다.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {members.map((m) => {
          const isSelf = m.id === currentUserId;
          const busy = busyId === m.id;
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--color-surface-1)',
                border: 'var(--border-hair) solid var(--color-border)',
                borderRadius: 'var(--radius)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="t-body" style={{ color: 'var(--color-text)' }}>
                  {m.name ?? '이름 미입력'}
                  {isSelf ? <span className="t-caption" style={{ color: 'var(--color-text-muted)' }}> · 나</span> : null}
                </div>
                <div className="t-caption" style={{ color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</div>
              </div>
              <span className="t-caption" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{ROLE_LABEL[m.role] ?? m.role}</span>
              {m.role === 'user' ? (
                <Button onClick={() => onPromote(m.id)} disabled={busy}>{busy ? '처리 중…' : '코치로 승격'}</Button>
              ) : m.role === 'coach' && !isSelf ? (
                <Button variant="ghost" onClick={() => onDemote(m.id)} disabled={busy}>{busy ? '처리 중…' : '멤버로 강등'}</Button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
