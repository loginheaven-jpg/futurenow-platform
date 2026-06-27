// 리포트(B③) 미리보기 (개발용) — 시각물·명명·의미색 절제 확인용. 운영 라우트 아님.
// report.tsx(@react-pdf 포함) 대신 ReportScreen·GroupView 를 직접 import → 클라이언트 번들 가벼움.
import type { FuturenowScores } from '@/instruments/futurenow/scoring';
import { ReportScreen } from '@/instruments/futurenow/report/ReportScreen';
import { GroupView } from '@/instruments/futurenow/report/GroupView';

const pre: FuturenowScores = {
  vitality: { score: 9, low: true },
  redFlag: { triggered: true, byVitality: false, byCareCheck: true },
  grow: { G: 2.5, R: 3, O: 2, W: 2.5, F: 3, faithAux: { F1: 2, F2: null } },
  trap: { D1: 4, D2: 3, D3: 2, primary: 'D1' },
  compass: { NAV1: 2, NAV2: 2, NAV3: 3, NAV4: 2 },
  gap: { B1: 4, B2: 3, B3: 5, B4: 4, B5: 3 },
  faith: { F1: 2, F2: null },
  subjective: { E1: '', E2: '', E3: '' },
};

const post: FuturenowScores = {
  vitality: { score: 16, low: false },
  redFlag: { triggered: false, byVitality: false, byCareCheck: false },
  grow: { G: 3.5, R: 4, O: 3.5, W: 3.5, F: 4, faithAux: { F1: 3, F2: 4 } },
  trap: { D1: 3, D2: 2, D3: 2, primary: 'D1' },
  compass: { NAV1: 4, NAV2: 3, NAV3: 4, NAV4: 4 },
  gap: { B1: 7, B2: 5, B3: 8, B4: 6, B5: 6 },
  faith: { F1: 3, F2: 4 },
  subjective: {
    E1: '막막함이 줄고, 다음 한 걸음이 보입니다.',
    E2: '두려움보다 기대가 조금 더 커졌습니다.',
    E3: '이 리듬을 계속 이어가고 싶습니다.',
  },
};

const member2: FuturenowScores = {
  ...post,
  vitality: { score: 12, low: false },
  grow: { G: 3, R: 2.5, O: 3, W: 2, F: 3.5, faithAux: { F1: null, F2: null } },
  gap: { B1: 5, B2: 6, B3: 4, B4: 7, B5: 5 },
  subjective: { E1: '', E2: '', E3: '' },
};

const navHeader: React.CSSProperties = {
  background: 'var(--color-primary)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-4)',
  marginBottom: 'var(--space-6)',
};
const sectionTitle: React.CSSProperties = { color: 'var(--color-primary)', margin: 'var(--space-6) 0 var(--space-3)' };

export default function ReportPreviewPage() {
  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <header style={navHeader}>
        <div className="t-h1" style={{ color: 'var(--color-text-on-accent)' }}>리포트 미리보기</div>
        <div className="t-caption" style={{ color: 'var(--color-accent)' }}>B③ 시각화 v2 — 인도자 화면</div>
      </header>

      <h2 className="t-h2" style={sectionTitle}>① 사후 리포트 — 사전→사후 비교</h2>
      <ReportScreen scores={post} prev={pre} />

      <h2 className="t-h2" style={sectionTitle}>② 사전 단독 — 시들음·돌봄 신호·구간 게이지</h2>
      <ReportScreen scores={pre} />

      <h2 className="t-h2" style={sectionTitle}>③ 그룹 평균 — 단계 사슬·간격 레이더</h2>
      <GroupView all={[post, member2, pre]} />
    </div>
  );
}
