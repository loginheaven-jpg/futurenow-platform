// 인쇄 전용 브랜드 문서 헤더(.print-only) — PDF 상단 표제. 화면엔 미노출(앱은 AppHeader 사용), 인쇄에서만 나타난다.
//   서비스 정체성 + 리포트 종류 + 대상·차수·회차·날짜. 디자인 토큰만 사용(디자인시스템 §8 준수).
import type { CSSProperties } from 'react';

const wrap: CSSProperties = {
  marginBottom: 'var(--space-6)',
  paddingBottom: 'var(--space-3)',
  borderBottom: '2px solid var(--color-primary)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  gap: 'var(--space-4)',
};

export function ReportPrintHeader({
  participantName,
  cohortName,
  waveLabel,
  dateStr,
}: {
  participantName: string;
  cohortName: string;
  waveLabel: string;
  dateStr: string;
}) {
  return (
    <header className="print-only" style={wrap}>
      <div>
        <div className="t-caption" style={{ color: 'var(--color-accent)', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>퓨처나우</div>
        <div className="t-display" style={{ color: 'var(--color-primary)', fontSize: 26, marginTop: 2 }}>개인 진단 리포트</div>
      </div>
      <div className="t-caption" style={{ textAlign: 'right', lineHeight: 1.7 }}>
        <div style={{ color: 'var(--color-text)', fontWeight: 600 }}>{participantName}</div>
        <div style={{ color: 'var(--color-text-secondary)' }}>{cohortName} · {waveLabel}</div>
        <div style={{ color: 'var(--color-text-muted)' }}>{dateStr}</div>
      </div>
    </header>
  );
}
