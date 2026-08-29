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
import { openedSessionNos } from '@/app/(member)/my/cohorts/[cohortId]/progress';
import { VALUE_TOOL } from '@/instruments/futurenow/values/copy';
import { LIBRARY_NAME } from '@/app/_vocab/library';

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
  opts: { hasFeed: boolean; now: number },
): Promise<MemberSheet> {
  const active = cohorts.filter((c) => c.status === 'active');
  const primary = active.length === 1 ? active[0] : null;

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
  const groups: MenuGroup[] = [
    {
      title: '여정',
      items: [
        primary
          ? { href: `/my/cohorts/${primary.cohortId}`, label: '내 기수' }
          : { href: '/my/cohorts', label: '내 기수' },
        ...(opts.hasFeed ? [{ href: '/feed', label: '동행' }] : []),
      ],
    },
    {
      title: '진단',
      items: [
        { href: '/home/assessments', label: '체크 허브' },
        primary
          ? { href: `/my/cohorts/${primary.cohortId}/values`, label: VALUE_TOOL }
          : { href: '/my/values', label: VALUE_TOOL },
      ],
    },
    { title: '자료', items: [{ href: '/library', label: LIBRARY_NAME }, { href: '/news', label: '소식' }] },
    { title: '계정', items: [{ href: '/account', label: '내 정보' }] },
  ];

  return { groups, chips, cohortName: primary?.name };
}
