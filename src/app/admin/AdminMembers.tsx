'use client';
// 본부(프레젠테이션 — 부수효과 없음). 운영자 화면(§8.6). 의미색 허용(참여자 화면 아님). 두 섹션 구분:
//   ① 승인 대기 — 코치 신청(user→coach) 승인/거절(decide_coach_application). ② 멤버 관리 — 역할 직접 승격/강등.
// 본인(운영자) 행은 강등 미제공(자기강등 가드의 UI 반영). 셸 통일(Step 3.1): AppHeader + headerActions.
import type { ReactNode } from 'react';
import { Button } from '@/core/ui';
import type { CoachApplication, MemberSummary } from '@/contracts';
import { AppHeader } from '@/app/_screens/AppHeader';

const ROLE_LABEL: Record<string, string> = { admin: '운영자', coach: '코치', user: '멤버' };

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  padding: 'var(--space-3) var(--space-4)',
  background: 'var(--color-surface-1)',
  border: 'var(--border-hair) solid var(--color-border)',
  borderRadius: 'var(--radius)',
} as const;

export function AdminMembers({
  members,
  applications,
  currentUserId,
  busyId,
  appBusyId,
  onPromote,
  onDemote,
  onApprove,
  onReject,
  headerActions,
}: {
  members: MemberSummary[];
  applications: CoachApplication[];
  currentUserId: string;
  busyId?: string | null;
  appBusyId?: string | null;
  onPromote: (id: string) => void;
  onDemote: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  headerActions?: ReactNode;
}) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="root" title="본부" subtitle="코치 신청·멤버 관리" homeHref="/admin" action={headerActions} />

      {/* ① 승인 대기 — 코치 신청 큐(멤버 역할 관리와 구분) */}
      <section style={{ marginBottom: 'var(--space-6)' }}>
        <h2 className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 17, margin: '0 0 var(--space-1)' }}>
          승인 대기{applications.length > 0 ? ` (${applications.length})` : ''}
        </h2>
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
          인도자(코치) 신청을 검토해 승인하거나 거절합니다. 승인하면 곧바로 코치로 전환돼요.
        </p>
        {applications.length === 0 ? (
          <p className="t-caption" style={{ color: 'var(--color-text-muted)', margin: 0 }}>대기 중인 신청이 없어요.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {applications.map((a) => {
              const busy = appBusyId === a.id;
              return (
                <div key={a.id} style={rowStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t-body" style={{ color: 'var(--color-text)' }}>{a.applicantName ?? '이름 미입력'}</div>
                    {a.motivation ? (
                      <div className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{a.motivation}</div>
                    ) : null}
                  </div>
                  <Button variant="ghost" onClick={() => onReject(a.id)} disabled={busy}>{busy ? '처리 중…' : '거절'}</Button>
                  <Button onClick={() => onApprove(a.id)} disabled={busy}>{busy ? '처리 중…' : '승인'}</Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ② 멤버 관리 — 역할 직접 승격/강등 */}
      <section>
        <h2 className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 17, margin: '0 0 var(--space-1)' }}>멤버 관리</h2>
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
          멤버를 코치로 승격하거나 되돌릴 수 있어요. 운영자 전용입니다.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {members.map((m) => {
            const isSelf = m.id === currentUserId;
            const busy = busyId === m.id;
            return (
              <div key={m.id} style={rowStyle}>
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
      </section>
    </div>
  );
}
