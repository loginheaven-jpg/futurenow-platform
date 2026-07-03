'use client';
// 개인 리포트 PDF 저장 — window.print() 로 브라우저 인쇄 대화상자("PDF로 저장"). A4 인쇄 스타일은 globals.css(@media print).
//   래스터화·무거운 라이브러리 없이 벡터 텍스트·SVG 차트 그대로 저장. 버튼은 no-print(PDF 본문 미포함).
import type { CSSProperties } from 'react';

const btnStyle: CSSProperties = {
  minHeight: 'var(--tap-min)',
  padding: '0 var(--space-4)',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--color-border-strong)',
  background: 'var(--color-surface-1)',
  color: 'var(--color-primary)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  fontWeight: 600,
};

export function ReportPrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="no-print t-caption" style={btnStyle} aria-label="PDF로 저장">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v8H6z" />
      </svg>
      PDF로 저장
    </button>
  );
}
