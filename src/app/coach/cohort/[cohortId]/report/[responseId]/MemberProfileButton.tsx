'use client';
// 리포트 화면 '신상정보 보기' 버튼 + 팝업(모달). 코치/운영자 전용. ADR-78.
//   진단결과를 보다 바로 참여자 인적사항(전화·이메일·주소·프로필·참여이력)을 확인 — 홈→멤버관리 왕복 제거.
//   화면 전용(연락처는 공유 PDF 미포함). 배경 클릭·ESC·✕로 닫기.
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { CohortMemberDetail } from '@/contracts';
import { MemberProfilePanel } from './MemberProfilePanel';

const btnStyle: CSSProperties = {
  minHeight: 'var(--tap-min)',
  padding: '0 var(--space-4)',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--color-border-strong)',
  background: 'transparent',
  color: 'var(--color-primary)',
  cursor: 'pointer',
};
const overlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(16,35,56,.45)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: 'var(--space-6) var(--space-4)',
  overflowY: 'auto',
  zIndex: 50,
};
const card: CSSProperties = {
  width: '100%',
  maxWidth: 440,
  background: 'var(--color-bg)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-3)',
  boxShadow: '0 12px 40px -8px rgba(16,35,56,.5)',
};
const closeBtn: CSSProperties = {
  minWidth: 'var(--tap-min)',
  minHeight: 'var(--tap-min)',
  border: 'none',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  fontSize: 18,
  cursor: 'pointer',
};

export function MemberProfileButton({ detail }: { detail: CohortMemberDetail }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="t-caption" style={btnStyle}>
        신상정보 보기
      </button>
      {open ? (
        <div role="dialog" aria-modal="true" aria-label="참여자 신상정보" onClick={() => setOpen(false)} style={overlay}>
          <div onClick={(e) => e.stopPropagation()} style={card}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setOpen(false)} aria-label="닫기" style={closeBtn}>✕</button>
            </div>
            <MemberProfilePanel detail={detail} />
          </div>
        </div>
      ) : null}
    </>
  );
}
