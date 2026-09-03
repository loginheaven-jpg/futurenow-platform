// 콘솔 시트 자료 — **순수 함수** (U-5 · 지휘부 결재 2026-09-03).
//
// ─────────────────────────────────────────────────────────────────────────────
// **왜 `consoleNav` 가 아니라 여기인가.**
//   `consoleNav` 는 껍데기(클라이언트)가 부르는 함수라 그 파일이 끌고 오는 것은 전부
//   브라우저 묶음에 실린다. 시트는 `_vocab/doors` 와 `memberSheet` 의 구획 이름을 읽으므로
//   **서버 쪽에서 짓고 값만 내려보낸다** — 회원 껍데기가 하는 것과 같은 방식이다.
//
// **참여자 시트와 같은 구획을 쓴다**(지휘부 지시 2026-09-03 「참여자에게 없는 복잡한 레이어가
//   인도자에게만 있어야 할 이유가 없다」). 이름을 하나도 짓지 않았다 — 넷 다 이미 있는 낱말이다:
//     · `PUBLIC_SHEET_MINE`(내 자리) · `ACCOUNT_GROUP`(계정) · `LIBRARY_NAME`(서가) · `_vocab/doors`
//
// **「내 홈」이 없다.** 인도자에게 `/home` 은 콘솔로 보내는 경유지이고, 콘솔은 이 시트를 여는
//   그 화면이다 — 자기 자신으로 가는 문을 두지 않는다(ADR-181 이 참여자 시트에서 이미 뺀 것).
// **「운영」 구획이 없다.** 「본부」는 「내 자리」로, 「가입 승인」은 「인도자」로 갔다
//   (결재 2026-09-03 「운영자의 「운영」 구획은 「내 자리」에 합칩니다」).
// ─────────────────────────────────────────────────────────────────────────────
import type { MenuGroup } from '@/app/_screens/site/MenuSheet';
import { ACCOUNT_GROUP } from '@/app/_lib/memberSheet';
import { PUBLIC_SHEET_MINE } from '@/app/_screens/site/publicNav';
import { ACCOUNT_DOOR, ADMIN_DOOR, CONSOLE_DOOR, SITE_DOOR } from '@/app/_vocab/doors';
import { LIBRARY_NAME } from '@/app/_vocab/library';

/**
 * 콘솔 시트의 구획 넷을 만든다.
 *
 * **「이 회기」는 여기 없다** — 그 다섯은 띠의 탭이 든다(결재 2026-09-03).
 * 시트와 탭이 같은 항목을 둘 다 들면 «같은 말을 두 번»이고, 그것이 이번 정비의 표적이었다.
 */
export function consoleSheet(role: 'user' | 'coach' | 'admin'): MenuGroup[] {
  const isAdmin = role === 'admin';
  return [
    { title: PUBLIC_SHEET_MINE, items: [CONSOLE_DOOR, ...(isAdmin ? [ADMIN_DOOR] : []), SITE_DOOR] },
    {
      title: '인도자',
      items: [
        { href: '/coach/cohorts', label: '모든 회기' },
        { href: '/coach/new', label: '회기 개설' },
        ...(isAdmin ? [{ href: '/admin/approvals', label: '가입 승인' }] : []),
      ],
    },
    { title: '자료', items: [{ href: '/library', label: LIBRARY_NAME }, { href: '/news', label: '소식' }] },
    { title: ACCOUNT_GROUP, items: [ACCOUNT_DOOR] },
  ];
}
