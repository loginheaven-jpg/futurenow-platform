// 역할 카드 — 통합 홈 최상단 하나(S-4 · IA 원칙 3 "홈은 거치되 한 번의 탭으로 벗어난다").
//
// **가두지 않는다.** ADR-51 이 역할별 거점 홈을 폐지하고 통합 홈으로 모은 결정은 그대로다 —
//   이 카드는 *네 자리는 저기다* 라고 가리킬 뿐이고, 아래 홈 본문이 다른 길을 계속 연다.
//   비대칭 개방(ADR-51)이 무너지지 않는 이유가 그것이다.
//
// 참여자 화면 규율: 경고색·배지 0. 역할을 **색이 아니라 문장**으로 말한다.
import Link from 'next/link';
import type { MyCohortSummary, Role } from '@/contracts/domain';

export function RoleCard({ role, cohorts }: { role: Role; cohorts: MyCohortSummary[] }) {
  // 참여자의 거점은 '차수 홈'이다. 차수가 여럿이면 목록이 거점이 된다 — 하나를 임의로 고르지 않는다.
  const active = cohorts.filter((c) => c.status === 'active');
  const target =
    role === 'admin' ? { href: '/admin', label: '본부', note: '승인·회원·차수를 관리합니다.' }
    : role === 'coach' ? { href: '/coach', label: '인도자 콘솔', note: '내 차수와 조원을 봅니다.' }
    : active.length === 1 ? { href: `/my/cohorts/${active[0].cohortId}`, label: active[0].name, note: '내 기수로 바로 갑니다.' }
    : active.length > 1 ? { href: '/my/cohorts', label: '내 기수', note: '참여 중인 기수를 봅니다.' }
    : { href: '/home/assessments', label: '체크', note: '지금 하실 수 있는 체크를 봅니다.' };

  return (
    <Link
      href={target.href}
      className="ui-card ui-tappable"
      style={{ display: 'block', textDecoration: 'none', padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}
    >
      <span className="t-body" style={{ fontWeight: 600 }}>{target.label}</span>
      <span className="t-caption" style={{ display: 'block', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
        {target.note}
      </span>
    </Link>
  );
}
