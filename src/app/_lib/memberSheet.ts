// 전체 메뉴 시트(시안 E)의 **자료 한 곳** — 4차 F-4.
//
// **사본이 셋이 될 자리였다.** `/home`(F-3) 이 조립하고, 차수 홈·진단 홈(F-4)이 또 조립하면
//   메뉴 하나가 늘 때 세 곳이 어긋난다(불변식 23). 시트는 화면마다 같아야 하는 물건이므로
//   **자료도 한 곳에서 만든다.**
//
// **부품도 화면도 계산하지 않으니, 계산은 여기 있다.** 데이터 접근은 계약 메서드뿐이고
//   판정은 순수 함수(`buildSessionChips`)에 맡긴다.
import type { CoreContext, MyCohortSummary } from '@/contracts';
import type { MenuGroup } from '@/app/_screens/site/MenuSheet';
import type { SessionChip } from '@/app/_screens/site/SessionChipStrip';
import { buildSessionChips } from '@/app/(member)/home/sessionChips';
import { primaryCohort } from '@/app/(member)/home/roleTarget';

/** 참여 신청 문 — **벨트 메뉴가 든 그 항목을 그대로 읽는다.** 이름을 여기서 짓지 않는다(불변식 23). */
const RECRUIT_DOOR = PUBLIC_NAV.find((i) => i.href === '/recruit') ?? { href: '/recruit', label: '참여 신청' };
import { openedSessionNos } from '@/app/(member)/my/cohorts/[cohortId]/progress';
import { VALUE_TOOL } from '@/instruments/futurenow/values/copy';
import { LIBRARY_NAME } from '@/app/_vocab/library';
import { HOME_DOOR, CONSOLE_DOOR, ADMIN_DOOR, SITE_DOOR } from '@/app/_vocab/doors';
import { PUBLIC_NAV, PUBLIC_SHEET_MINE } from '@/app/_screens/site/publicNav';
import { JOIN_BY_CODE, MY_REPORT, MY_SEMINARS } from '@/app/_vocab/memberMenu';

export interface MemberSheet {
  groups: MenuGroup[];
  chips: SessionChip[];
  /** 시트 머리의 기수 배지. 활성 차수가 하나일 때만 있다. */
  cohortName?: string;
}

/**
 * 시트 자료를 만든다.
 *
 * **회차 칩은 활성 차수가 하나일 때만** 만든다 — 여럿이면 어느 기수의 회차인지 말할 수 없고,
 * 시트는 *내* 여정을 보이는 자리라 임의로 하나를 고르지 않는다(`roleTarget` 과 같은 판단).
 *
 * 제출 조회는 **이미 열린 회차에만** 팬아웃한다 — 미래 회차는 카드 라우트가 진입을 막아
 * 제출이 있을 수 없다. 차수 홈이 쓰는 것과 같은 방식이고 **계약·DB 델타 0** 이다.
 *
 * `hasFeed` 를 화면이 준다 — 피드 조회는 화면마다 이미 하고 있거나 하지 않는다.
 * **없는 곳으로 보내지 않는다**: 피드를 가진 기수가 없으면 그 항목을 만들지 않는다.
 */
export async function buildMemberSheet(
  ctx: CoreContext,
  cohorts: MyCohortSummary[],
  opts: { hasFeed: boolean; now: number; role?: 'user' | 'coach' | 'admin'; cohortCount?: number; reportCohortId?: string | null; homeIsDashboard?: boolean },
): Promise<MemberSheet> {
  // ★ 「어느 회기인가」를 여기서 따로 정하지 않는다(ADR-182) — 화면마다 다르게 세던 것이
  //   지난 회차가 드러낸 결함이다. **활성이 둘 이상이어도** 지금 보고 있을 회기의 칩을 보인다.
  const primary = primaryCohort(cohorts);

  let chips: SessionChip[] = [];
  if (primary) {
    const sessions = await ctx.listCohortSessions(primary.cohortId).catch(() => []);
    const submitted = new Set(
      (
        await Promise.all(
          openedSessionNos(sessions, opts.now).map(async (n) => {
            const row = await ctx.getMyCheckin(primary.cohortId, n).catch(() => null);
            return row?.submittedAt != null ? n : null;
          }),
        )
      ).filter((n): n is number => n != null),
    );
    chips = buildSessionChips({
      cohortId: primary.cohortId,
      sessions,
      submitted,
      openSessionNo: primary.openSessionNo,
      now: opts.now,
    });
  }

  // 시안 E 그룹 넷. **로그아웃은 넣지 않는다** — 폼 액션이라 링크 목록에 섞으면
  //   생김새는 같은데 하나만 다르게 동작한다. `/account` 안에 이미 있다(F-3 판정 · 지휘부 승인).
  const isStaff = opts.role === 'coach' || opts.role === 'admin';
  const many = (opts.cohortCount ?? 0) > 1;
  const noCohort = (opts.cohortCount ?? 0) === 0;

  const groups: MenuGroup[] = [
    // ★ **출구 구획**(ADR-181 · 지휘부 지시 2026-09-02 「서비스홈으로, 사용자홈으로 언제든 갈 수 있어야 한다」).
    //   전에는 회원 시트에 `/` 도 `/home` 도 `/coach` 도 **없었다** — 실측으로 확인한 구멍이다.
    //   폰의 제목바 화면에는 벨트가 안 서므로(ADR-174) 상표를 누를 자리조차 없었다.
    //   **이름은 하나도 짓지 않았다** — `_vocab/doors` 가 단일 출처다.
    //   구획 이름은 공개 시트와 **같은 낱말**을 쓴다(뜻이 같은데 다르게 부르지 않는다).
    {
      title: PUBLIC_SHEET_MINE,
      items: [
        HOME_DOOR,
        ...(isStaff ? [CONSOLE_DOOR] : []),
        ...(opts.role === 'admin' ? [ADMIN_DOOR] : []),
        SITE_DOOR,
      ],
    },
    {
      title: '여정',
      items: [
        // ★★ **회기가 하나도 없으면 「참여 신청」이 그 자리다**(ADR-182 · 지휘부 정의 2026-09-03
        //   「회기 0 인 사람들은 **가입은 했지만 세미나 참여신청을 하지 않은 사람들**입니다」).
        //   전에는 「내 회기」가 **빈 목록**으로 보냈다 — 없는 곳으로 보내는 것에 가깝다.
        //   문안은 짓지 않았다 — 벨트 메뉴의 「참여 신청」을 그대로 읽는다(불변식 23).
        ...(noCohort
          ? [RECRUIT_DOOR]
          // ★ **홈이 곧 그 회기면 문을 두 번 두지 않는다**(ADR-181). 위 「내 자리」 구획의
          //   「내 홈」이 이미 그 화면이다 — 배포해서 눈으로 보고 잡았다.
          : opts.homeIsDashboard
            ? []
            : [primary
                ? { href: `/my/cohorts/${primary.cohortId}`, label: '내 회기' }
                : { href: '/my/cohorts', label: '내 회기' }]),
        ...(opts.hasFeed ? [{ href: '/feed', label: '동행' }] : []),
        // 회기가 둘 이상일 때만 목록 문을 낸다 — 하나면 위 항목이 곧 그 회기다(없는 곳으로 보내지 않는다).
        ...(many ? [{ href: '/my/cohorts', label: MY_SEMINARS }] : []),
      ],
    },
    {
      title: '진단',
      items: [
        { href: '/home/assessments', label: '체크 허브' },
        primary
          ? { href: `/my/cohorts/${primary.cohortId}/values`, label: VALUE_TOOL }
          : { href: '/my/values', label: VALUE_TOOL },
        // 리포트는 **갈 곳이 있을 때만** 낸다 — 사전 진단을 마친 회기가 하나로 정해질 때다.
        ...(opts.reportCohortId ? [{ href: `/my/cohorts/${opts.reportCohortId}/report`, label: MY_REPORT }] : []),
      ],
    },
    { title: '자료', items: [{ href: '/library', label: LIBRARY_NAME }, { href: '/news', label: '소식' }] },
    // 「코드로 세미나 참여」는 홈 아래쪽에 있던 것을 여기로 옮겼다(지시: 메뉴는 햄버거 휘하).
    { title: '계정', items: [{ href: '/account', label: '내 정보' }, { href: '/join', label: JOIN_BY_CODE }] },
  ];

  return { groups, chips, cohortName: primary?.name };
}
