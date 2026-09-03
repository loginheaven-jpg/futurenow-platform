// 가입 승인 큐 — 시안 P4 (S-1 단계 5 · ADR-122). 운영자 전용.
//
// **이 화면의 전부는 대조 키다**(§4.3). 이름과 이메일만 보이면 승인은 추측이 된다.
//   포럼 가입 이름·연락처가 표에 함께 떠야 촉진자포럼 명단과 맞춰 볼 수 있다.
//
// **전화번호는 여기서 잘린다.** RPC 가 원값을 주지만 클라이언트로 넘기는 것은 `maskPhone`
//   결과뿐이라, 원값이 브라우저 번들에 실리지 않는다(불변식 13 · 초안 §4.2 승인분).
//   전체 노출이 필요하면 기존 게이트(`getContactDetail`)를 지난다 — 여기에 우회로를 만들지 않는다.
import { redirect } from 'next/navigation';
import { requestContext, requestUser } from '@/app/_lib/requestScope';
import { maskPhone } from '@/app/_lib/maskPhone';
import { ApprovalsClient, type QueueRowView } from './ApprovalsClient';
import { ConsoleTitle } from '@/app/_screens/console/ConsoleTitle';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
  // ★ **한 렌더에 한 번만 묻는다**(ADR-178 · U-6 이 콘솔로 넓혔다) — 껍데기가 이미 물은 것을 다시 묻지 않는다.
  const ctx = await requestContext();
  const me = await requestUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home');
  if (me.role !== 'admin') redirect('/coach');

  const rows = await ctx.listMembershipQueue(); // 대기 갈래뿐 — 창 인자가 없어졌다(2026-08-30)

  // 서버 경계에서 마스킹. 이 map 을 지나면 원값은 더 이상 존재하지 않는다.
  const view: QueueRowView[] = rows.map((r) => ({
    bucket: r.bucket,
    userId: r.userId,
    name: r.name,
    email: r.email,
    forumName: r.forumName,
    forumPhoneMasked: maskPhone(r.forumPhone),
    signupNote: r.signupNote,
    state: r.state,
    validUntil: r.validUntil,
    createdAt: r.createdAt,
  }));

  const defaultValidUntil = rows[0]?.defaultValidUntil ?? null;

  // ★ **본문 폭과 화면 이름은 라우트가 든다**(U-6). 표현 부품 안에 두면 그 부품이
  //   라우팅에 매여 단독 렌더가 안 되고, 폭이 부품마다 흩어진다.
  return (
    <div className="console-body console-body--wide">
      <ConsoleTitle />
      <ApprovalsClient
      rows={view}
      // 유효기간 기본값은 **DB 가 계산해 보낸 값**이다. TS 는 기본 개월수를 모른다
      //   — 상수는 `membership_default_months()` 한 곳에만 있다(IA §12-2 확정 시 그것만 고친다).
      defaultValidUntil={defaultValidUntil}
      currentUserId={me.id}
      />
    </div>
  );
}
