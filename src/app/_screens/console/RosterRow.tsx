'use client';
// 명단 행(§8.3) — ListRow(응답자면 리포트 진입) + 휴지통(회기에서 제거·2단계 컨펌). 인도자(자기 회기)·운영자 전용.
//   삭제는 파괴적(응답·참여 영구 삭제)이라 반드시 컨펌 후 실행. 성공 시 부모가 refresh → 행 소멸.
import { useState } from 'react';
import { Button, ListRow } from '@/core/ui';
import type { RosterMember } from '../types';
import { toolName } from '@/app/_vocab/tool';

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
  // ★ **이 행이 여는 문서가 무엇인지 행에서 읽힌다**(U-11 · 지휘부 결재 ADR-193 권고 ㈐).
  //   명단은 그 사람의 «돌봄 표시 응답, 없으면 최신 응답» 을 싣는다 — **마무리가 열린 뒤에는 최신이 사후다.**
  //   그 전에는 전부 사전이라 말할 것이 없으므로 `post` 일 때만 붙인다(없는 구분을 지어내지 않는다).
  //   **새 문안 0** — `toolName` 이 확정 어휘를 든다. 돌봄 사유는 그대로 우선한다(그것이 더 급하다).
  const subtitle =
    member.status === 'care'
      ? member.note
      : member.status === 'pending'
        ? '미응답'
        : member.wave === 'post'
          ? toolName('post')
          : undefined;

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
          <strong>{member.name}</strong> 님을 이 회기에서 지울까요? 이 참여자의 응답·참여가 영구 삭제돼요. 되돌릴 수 없어요.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setConfirm(false)} disabled={busy}>취소</Button>
          <Button onClick={doRemove} disabled={busy} style={{ background: 'var(--care-text)' }}>{busy ? '지우는 중…' : '삭제'}</Button>
        </div>
      </div>
    );
  }

  // 주 함정 태그(Phase 3·ADR-77) — 소그룹 편성 참고. 중립 pill(care 톤 아님). 응답자만(member.trap 있을 때).
  const title = member.trap ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
      {member.name}
      <span
        className="t-micro"
        title="주 함정 (소그룹 편성 참고)"
        style={{ color: 'var(--color-text-secondary)', background: 'var(--color-surface-sunken)', borderRadius: 'var(--radius-pill)', padding: '1px var(--space-2)', fontWeight: 600 }}
      >
        {member.trap}
      </span>
    </span>
  ) : (
    member.name
  );

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 'var(--space-1)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <ListRow
          tone={tone}
          title={title}
          subtitle={subtitle}
          trailing={responded ? '›' : undefined}
          onClick={responded && onOpen ? () => onOpen(member.id) : undefined}
        />
      </div>
      {canRemove ? (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          aria-label={`${member.name} 회기에서 제거`}
          title="회기에서 제거(휴지통)"
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
