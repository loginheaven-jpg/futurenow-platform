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
  title = '개인 체크 리포트',
  screen = false,
}: {
  participantName: string;
  cohortName: string;
  waveLabel: string;
  dateStr: string;
  /** 문서 종류. 갈무리 세로 보기(ADR-118)가 같은 헤더를 쓰되 표제만 다르다 — 사본을 만들지 않는다. */
  title?: string;
  /**
   * 화면에도 세울 것인가(ADR-188). 기본은 **인쇄 전용**이다 — 인도자 화면은 그대로다.
   * 참여자 리포트가 «표제부는 인도자용과 동일» 이라 이 문서 머리를 화면에서 쓴다.
   * **사본을 만들지 않는다** — 같은 머리를 두 벌 두면 한쪽만 고쳐지는 날 두 문서가 달라진다.
   */
  screen?: boolean;
}) {
  return (
    <header className={screen ? undefined : 'print-only'} style={wrap}>
      <div>
        <div className="t-caption" style={{ color: 'var(--color-accent)', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>퓨처나우</div>
        <div className="t-display" style={{ color: 'var(--color-primary)', fontSize: 26, marginTop: 2 }}>{title}</div>
      </div>
      <div className="t-caption" style={{ textAlign: 'right', lineHeight: 1.7 }}>
        <div style={{ color: 'var(--color-text)', fontWeight: 600 }}>{participantName}</div>
        <div style={{ color: 'var(--color-text-secondary)' }}>{cohortName} · {waveLabel}</div>
        <div style={{ color: 'var(--color-text-muted)' }}>{dateStr}</div>
      </div>
    </header>
  );
}
