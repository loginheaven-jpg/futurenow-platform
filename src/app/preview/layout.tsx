// 개발용 미리보기 게이트(ADR-93). /preview 이하 **전부**를 한 자리에서 막는다.
//   페이지마다 게이트를 넷 다는 대신 레이아웃 하나 — 앞으로 미리보기 라우트가 늘어도 opt-in 없이 덮인다
//   (`PROXY_MATCHER` 불변식과 같은 사고: 신규 경로가 기본으로 보호되고, 뚫으려면 명시적으로 손대야 한다).
//
// 왜 필요한가: 이 계열은 파일 첫 줄에 '운영 라우트 아님'이라 선언해 놓고 `PROTECTED_PREFIXES` 밖에 있어
//   인증 없이 운영 도메인에서 열렸다. 사용자 데이터는 없지만(stub 컨텍스트) 나가는 것이 사업의 핵심 자산이다 —
//   `/preview` 는 `futurenowFlow` 를 클라이언트로 import 해 **사전진단 문항 원문 전량**이 정적 청크에 실리고,
//   `/preview/report` 는 리포트 구조와 명명(§9.4)을 프리렌더 본문에 그대로 담는다.
//
// 이중 방어: 세션은 미들웨어(`PROTECTED_PREFIXES`)가, 역할은 여기가 막는다. 게이트 기준은 인도자 콘솔과 동일하게
//   `role === 'user'` → `/home`(ADR-92). 참여자는 자기 흐름에서 문항을 정상적으로 만나므로 이 자리는 필요 없다.
import { redirect } from 'next/navigation';
import { createServerContext } from '@/core/supabase/server';

export const dynamic = 'force-dynamic'; // 프리렌더 금지 — 게이트가 붙었는데 정적 HTML 이 남으면 의미가 없다.

export default async function PreviewLayout({ children }: { children: React.ReactNode }) {
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role === 'user') redirect('/home');

  return <>{children}</>;
}
