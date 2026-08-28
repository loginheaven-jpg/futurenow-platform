// 공개 껍데기 — **화면은 헤더를 그리지 않는다** (U-1 · `design_system.md` §12).
//
// 상단바와 푸터가 여기 **한 곳**에 선다. 화면은 자기가 어느 껍데기에 사는지만 선언하고
//   (= `(public)/` 아래에 사는 것으로 선언이 끝난다) 본문만 그린다.
//   **경로가 곧 선언이므로 화면이 잊어버릴 수가 없다**(§12.2).
//
// ─────────────────────────────────────────────────────────────────────────────
// **ISR 을 깨지 않는다 — 옮기는 것이지 새로 짜는 것이 아니다.**
//
//   `/`(revalidate 300)와 `/recruit`(300)은 정적으로 캐시된다. 서버 컴포넌트에서
//   `cookies()` 를 부르는 순간 라우트가 **동적**이 되고 4차의 게이트가 깨진다.
//   그래서 이 껍데기는 **서버에서 세션을 읽지 않는다.** 세션 판정은 `PublicGnb` 가
//   브라우저에서 쿠키 **이름 접두사만** 보고 한다(ADR-138 · 그 파일 머리에 근거가 있다).
//   **이미 배포되어 돌고 있는 방식을 자리만 옮겼다.**
//
//   ⚠ **한 프레임 깜빡임이 함께 옮겨진다.** 정적 HTML 은 `로그인` 으로 그려지고
//     로그인한 사람에게만 마운트 뒤 `내 홈` 으로 바뀐다. **새 결함이 아니다** —
//     ADR-138 로 배포되어 최박사 실기기에서 확인된 동작이고, ISR 을 지키는 값이다.
//     **적어 두지 않으면 다음 사람이 새 결함으로 오해한다.**
// ─────────────────────────────────────────────────────────────────────────────
//
// **로고는 처음 화면(`/`)으로 이동만 한다 — 로그아웃이 아니다**(§12.3 규칙 3).
//   그 동작은 `SiteGnb` 가 이미 갖고 있고 여기서 바꾸지 않는다.
import { PublicGnb } from './PublicGnb';
import { SiteFooter } from './SiteFooter';
import Link from 'next/link';
import {
  PUBLIC_NAV, PUBLIC_FOOTER_LINKS, SITE_ORG,
  FOOTER_NOTE_HREF, FOOTER_NOTE_LEAD, FOOTER_NOTE_LINK,
} from './publicNav';

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* `currentPath` 를 넘기지 않는다 — `PublicGnb` 가 `usePathname()` 으로 스스로 안다.
          껍데기가 화면마다 다른 값을 들고 있으면 그것이 곧 사본 둘이다(불변식 23). */}
      <PublicGnb logo={<>퓨처<b>나우</b></>} en="FUTURE NOW" items={PUBLIC_NAV} />
      <main>{children}</main>
      <SiteFooter
        org={SITE_ORG}
        links={PUBLIC_FOOTER_LINKS}
        note={
          <>
            {FOOTER_NOTE_LEAD}
            <Link
              href={FOOTER_NOTE_HREF}
              style={{ color: 'var(--color-accent-strong)', textDecoration: 'underline' }}
            >
              {FOOTER_NOTE_LINK}
            </Link>
          </>
        }
      />
    </>
  );
}
