'use client';
// 명단 행(§8.3) — ListRow(응답자면 리포트 진입) + 휴지통(차수에서 제거·2단계 컨펌). 인도자(자기 차수)·운영자 전용.
//   삭제는 파괴적(응답·참여 영구 삭제)이라 반드시 컨펌 후 실행. 성공 시 부모가 refresh → 행 소멸.
import { useState } from 'react';
import { Button, ListRow } from '@/core/ui';
import type { RosterMember } from '../types';

export function RosterRow({
  member,
  onOpen,
  onRemove,
  canRemove = false,
}: {
  member: RosterMember;
  onOpen?: (responseId: string) => void; // 응답자(care/done)만 — id=responseId
  onRemove?: (userId: string, name: string) => void | Promise<void>;
  canRemove?: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const responded = member.status !== 'pending';
  const tone = member.status === 'care' ? 'care' : 'default';
  const subtitle = member.status === 'care' ? member.note : member.status === 'pending' ? '미응답' : undefined;

  async function doRemove() {
    setBusy(true);
    try {
      await onRemove?.(member.userId, member.name); // 성공 시 부모 refresh → 언마운트
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  if (confirm) {
    return (
      <div style={{ padding: 'var(--space-3)', background: 'var(--color-surface-1)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <p className="t-caption" style={{ color: 'var(--care-text)', margin: 0 }}>
          <strong>{member.name}</strong> 님을 이 차수에서 지울까요? 이 참여자의 응답·참여가 영구 삭제돼요. 되돌릴 수 없어요.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setConfirm(false)} disabled={busy}>취소</Button>
          <Button onClick={doRemove} disabled={busy} style={{ background: 'var(--care-text)' }}>{busy ? '지우는 중…' : '삭제'}</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 'var(--space-1)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <ListRow
          tone={tone}
          title={member.name}
          subtitle={subtitle}
          trailing={responded ? '›' : undefined}
          onClick={responded && onOpen ? () => onOpen(member.id) : undefined}
        />
      </div>
      {canRemove ? (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          aria-label={`${member.name} 차수에서 제거`}
          title="차수에서 제거(휴지통)"
          style={{
            flexShrink: 0,
            width: 'var(--tap-min)',
            minHeight: 'var(--tap-min)',
            border: 'var(--border-hair) solid var(--color-border)',
            borderRadius: 'var(--radius)',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          🗑
        </button>
      ) : null}
    </div>
  );
}
