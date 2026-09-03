// 콘솔 레이아웃 — **인도자와 운영자가 같은 것을 쓴다** (U-5).
//
// **전에는 사본 둘이었다** — `coach/layout.tsx` 와 `admin/layout.tsx` 가 머리 주석 한 줄만
//   다르고 나머지가 **한 글자도 같았다**(실측). 시트가 붙으면서 둘 다 길어질 자리라
//   여기로 합친다(불변식 23 — 사본이 둘이면 잠금으로 묶거나 하나로 만든다).
import { createServerContext } from '@/core/supabase/server';
import { ChromeProvider } from '@/app/_screens/shell/chromeContext';
import { ConsoleShell } from '@/app/_screens/console/ConsoleShell';
import { consoleSheet } from '@/app/_screens/console/consoleSheet';
import { ACCOUNT_GROUP } from '@/app/_lib/memberSheet';
import { LogoutButton } from '@/app/_screens/LogoutButton';
import { ROLE_WORD } from '@/app/(member)/home/roleTarget';

export async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const me = await (await createServerContext()).currentUser().catch(() => null);
  if (!me) return <>{children}</>; // 미인증은 셸 없이 통과 — 차단은 페이지·미들웨어가 한다.

  // ★ **로그아웃을 계정 구획에 붙인다**(ADR-188 과 같은 방식). 자료(`consoleSheet`)는 순수하게
  //   두고 **동작만 여기서** 얹는다 — 링크 목록에 섞지 않고 구분선 아래에 세운다.
  const groups = consoleSheet(me.role).map((g) =>
    g.title === ACCOUNT_GROUP ? { ...g, action: <LogoutButton variant="sheet" /> } : g,
  );

  return (
    <ChromeProvider>
      <ConsoleShell
        role={me.role}
        sheet={{ name: me.name?.trim() || me.email.split('@')[0] || '회원', role: ROLE_WORD[me.role], groups }}
      >
        {children}
      </ConsoleShell>
    </ChromeProvider>
  );
}
