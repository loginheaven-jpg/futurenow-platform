// 본부 멤버 관리(§8.6 첫 조각) — 운영자 전용 서버 컴포넌트. listUsers(기존 메서드) 배선.
import { REPORT_NOTICE } from '@/app/(public)/library/copy';
import { redirect } from 'next/navigation';
import { createServerContext } from '@/core/supabase/server';
import { AdminClient } from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home'); // 멤버는 자기 집으로
  if (me.role !== 'admin') redirect('/coach'); // 코치(비운영자)는 코치 콘솔로

  // 멤버 목록(직접 역할관리) + 코치 신청 대기 큐(승인/거절) — 둘을 구분해 본부에 노출.
  // 미처리 문의 건수(S-4 후속 ①). **운영자가 어차피 승인 큐를 보러 오는 자리에 숫자를 놓는다** —
  //   `/contact` 는 DB 로 적재되고 알림 수단이 없어(SMTP 부재), 화면을 열어 볼 이유를 숫자가 만든다.
  //   목록·상세는 콘솔 내비와 함께 세운다(RPC 는 이미 있다). 실패는 조용히 0 — 본부가 안 열리는 것보다 낫다.
  const [members, applications, contacts, reportCount] = await Promise.all([
    ctx.listUsers(),
    ctx.listCoachApplications('pending'),
    ctx.listContactMessages(true).catch(() => []),
    // 서가 신고(갈래 ㄴ · 결재 ⑹⑺) — **문의와 같은 자리**다. 실패는 조용히 0.
    ctx.countOpenLibraryReports().catch(() => 0),
  ]);

  // 0 건이면 줄을 그리지 않는다 — 늘 떠 있는 '0' 은 읽히지 않고 자리만 차지한다.
  // 서가 신고 줄 — 문의 줄과 **글자 구조가 같다**. 부제만 다르다:
  //   문의는 목록 화면이 «준비 중» 이지만 **신고는 목록 화면을 만들지 않기로 했으므로**
  //   「준비 중」이라 쓰면 **없는 약속**이 된다(발주 §2-4 ㉩).
  const reportNotice =
    reportCount > 0 ? (
      <div className="ui-listrow" style={{ marginBottom: 'var(--space-4)' }}>
        <span className="t-body">{REPORT_NOTICE.line(reportCount)}</span>
        <span className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          {REPORT_NOTICE.sub}
        </span>
      </div>
    ) : null;

  const notices =
    contacts.length > 0 ? (
      <div className="ui-listrow" style={{ marginBottom: 'var(--space-4)' }}>
        <span className="t-body">확인하지 않은 문의 {contacts.length}건</span>
        <span className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
          목록 화면은 준비 중입니다
        </span>
      </div>
    ) : null;

  const allNotices = (notices || reportNotice) ? (<>{notices}{reportNotice}</>) : null;

  return <AdminClient members={members} applications={applications} currentUserId={me.id}
      // **서버가 내린다** — 화면이 이메일로 판정하지 않는다(이메일 상수는 `is_super_admin` 한 곳뿐).
      isSuperAdmin={members.find((m) => m.id === me.id)?.isSuperAdmin === true} notices={allNotices} />;
}
