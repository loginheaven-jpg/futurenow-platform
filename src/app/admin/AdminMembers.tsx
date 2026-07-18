'use client';
// 본부(프레젠테이션 — 부수효과 없음). 운영자 화면(§8.6). 의미색 허용(참여자 화면 아님). 두 섹션 구분:
//   ① 승인 대기 — 코치 신청(user→coach) 승인/거절(decide_coach_application). ② 멤버 관리 — 역할 직접 승격/강등.
// 본인(운영자) 행은 강등 미제공(자기강등 가드의 UI 반영). 셸 통일(Step 3.1): AppHeader + headerActions.
import type { ReactNode } from 'react';
import { Button } from '@/core/ui';
import type { CoachApplication, MemberSummary } from '@/contracts';
import { AppHeader } from '@/app/_screens/AppHeader';
import { MemberRow } from './MemberRow';

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
  onDelete,
  onSetPassword,
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
  onDelete: (id: string) => void;
  onSetPassword: (id: string, password: string) => Promise<{ ok: boolean }>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  headerActions?: ReactNode;
}) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="root" title="본부" subtitle="인도자 신청·멤버 관리" homeHref="/home" action={headerActions} />

      {/* ① 승인 대기 — 인도자 신청 큐(멤버 역할 관리와 구분) */}
      <section style={{ marginBottom: 'var(--space-6)' }}>
        <h2 className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 17, margin: '0 0 var(--space-1)' }}>
          승인 대기{applications.length > 0 ? ` (${applications.length})` : ''}
        </h2>
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
          인도자 신청을 검토해 승인하거나 거절합니다. 승인하면 곧바로 인도자로 전환돼요.
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

      {/* ② 멤버 관리 — 역할 직접 승격/강등 + 이름 클릭 세부(신원·활동) + 삭제 */}
      <section>
        <h2 className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 17, margin: '0 0 var(--space-1)' }}>멤버 관리</h2>
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
          이름을 누르면 세부정보(신원·활동)를 볼 수 있어요. 승격·강등·삭제는 운영자 전용입니다.
          <br />
          <span style={{ color: 'var(--color-text-muted)' }}>인도자로 승격하실 분은 표시 이름이 <strong>실명</strong>인지 먼저 확인해 주세요.</span>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              isSelf={m.id === currentUserId}
              busy={busyId === m.id}
              onPromote={onPromote}
              onDemote={onDemote}
              onDelete={onDelete}
              onSetPassword={onSetPassword}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
