// 승인 대기 안내 — 시안 G · 확정 문안(S-1 단계 5 · ADR-122).
//
// **보호 접두사에 넣지 않는다**(IA v2.1 §2.2 명문화). 대기자는 **이미 인증된 사용자**라
//   미들웨어 인증 게이트가 할 일이 없고, `PROTECTED_PREFIXES` 에 항목을 더하면
//   불변식 17(matcher 커버리지) 근처를 건드리게 된다. 세션 확인은 이 페이지가 한다.
//
// **막다른 골목이 아니다**(§4.6). 빈 화면은 고장으로 읽힌다 — 지금 어느 단계인지, 무엇을
//   기다리는지, 얼마나 걸리는지, 어디로 문의하는지를 문장으로 말하고, 지금도 할 수 있는 것을 둔다.
//
// **딥링크가 여기로 떨어져도 오류를 띄우지 않는다.** returnTo 는 `safeReturnTo` 를 지난 것만
//   보관하고, 승인 뒤 그 자리로 돌아간다.
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerContext } from '@/core/supabase/server';
import { safeReturnTo } from '@/app/_lib/safeReturn';
import { LIBRARY_NAME } from '@/app/_vocab/library';

export const dynamic = 'force-dynamic';

// 상태별 문안. **보류에게 판단 사유를 말하지 않는다**(§4.5 — 사유는 내부 메모로만).
//   확인이 필요하다는 사실과 문의처만 보인다.
const COPY = {
  pending: {
    title: '가입 신청이 접수되었습니다',
    lead: '운영자가 촉진자포럼 명단과 확인한 뒤 체크를 열어 드립니다.',
    step2: '보통 하루 이틀 안에 확인합니다.',
  },
  held: {
    title: '확인이 필요한 신청입니다',
    lead: '운영자가 신청 내용을 확인하고 있습니다. 아래 문의처로 알려 주시면 더 빠릅니다.',
    step2: '확인에 시간이 걸리고 있습니다.',
  },
  expired: {
    title: '이용 기간이 지났습니다',
    lead: '새 체크는 잠시 닫혀 있습니다. 지금까지 하신 체크의 결과는 그대로 보실 수 있습니다.',
    step2: '갱신은 운영자가 확인해 드립니다.',
  },
} as const;

export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');

  // 게이트를 데이터보다 **먼저** 통과시킨다(CLAUDE §9). 응시 자격이 있으면 여기 머물 이유가 없다.
  const state = await ctx.getMyMemberState();
  const back = safeReturnTo((await searchParams).returnTo);
  if (state === 'cohort' || state === 'individual') redirect(back ?? '/home');

  const copy = state === 'held' ? COPY.held : state === 'expired' ? COPY.expired : COPY.pending;
  const muted = { color: 'var(--color-text-secondary)' } as const;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* **헤더는 껍데기가 그린다**(U-2 · §12.3 규칙 1). 제목·뒤로는 `_lib/screenChrome` 표가 든다 —
          제목은 라우트의 성질이지 화면의 사정이 아니다. */}

      <h1 className="t-title" style={{ marginTop: 'var(--space-5)' }}>{copy.title}</h1>
      <p className="t-body" style={{ ...muted, marginTop: 'var(--space-2)' }}>{copy.lead}</p>

      {/* 3단계 — 지금 어디에 있는지. 기호로만 가른다(참여자 화면 경고색 금지 · 불변식 9). */}
      <ol
        className="ui-card"
        style={{ listStyle: 'none', margin: 'var(--space-5) 0 0', padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-4)' }}
      >
        {[
          { mark: '✓', name: '가입 신청', note: '접수되었습니다', done: true },
          { mark: '●', name: '운영자 확인', note: copy.step2, done: false, now: true },
          { mark: '○', name: '체크 이용', note: '확인이 끝나면 이 화면이 열립니다', done: false },
        ].map((s) => (
          <li key={s.name} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
            <span aria-hidden style={{ width: 20, textAlign: 'center', ...(s.done || s.now ? {} : muted) }}>{s.mark}</span>
            <span>
              <span className="t-body" style={{ fontWeight: s.now ? 600 : 400 }}>{s.name}</span>
              <span className="t-caption" style={{ ...muted, display: 'block' }}>{s.note}</span>
            </span>
          </li>
        ))}
      </ol>

      {/* 지금도 할 수 있는 것 — 막다른 골목이면 사람은 돌아오지 않는다(§4.6).
          **S-4 로 세 링크를 되살렸다**(단계 5 §6.2 이월). 그때는 목적지가 없어 걸지 않았고,
          이제 있으므로 시안 G 의 셋이 제자리로 돌아온다. */}
      <h2 className="t-body" style={{ marginTop: 'var(--space-6)', fontWeight: 600 }}>지금도 하실 수 있는 것</h2>
      <div style={{ marginTop: 'var(--space-3)', display: 'grid', gap: 'var(--space-2)' }}>
        <Link href="/news" className="ui-listrow ui-listrow--tappable" style={{ textDecoration: 'none' }}>
          <span className="t-body">소식 보기</span>
        </Link>
        <Link href="/library" className="ui-listrow ui-listrow--tappable" style={{ textDecoration: 'none' }}>
          <span className="t-body">공개 {LIBRARY_NAME}</span>
        </Link>
        <Link href="/recruit" className="ui-listrow ui-listrow--tappable" style={{ textDecoration: 'none' }}>
          <span className="t-body">세미나 참여 신청</span>
        </Link>
        <Link href="/account" className="ui-listrow ui-listrow--tappable" style={{ textDecoration: 'none' }}>
          <span className="t-body">내 정보 확인</span>
        </Link>
      </div>

      {back ? (
        <p className="t-caption" style={{ ...muted, marginTop: 'var(--space-5)' }}>
          확인이 끝나면 조금 전에 열려던 자리로 돌아갑니다.
        </p>
      ) : null}

      <p className="t-caption" style={{ ...muted, marginTop: 'var(--space-5)' }}>
        확인이 늦어지거나 잘못 접수된 것 같으면{' '}
        <Link href="/contact" style={{ color: 'var(--color-primary)' }}>문의</Link>로 알려 주십시오.
        신청하신 내용은 그대로 남아 있습니다.
      </p>
    </div>
  );
}
