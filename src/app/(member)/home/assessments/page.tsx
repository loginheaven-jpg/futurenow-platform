// 체크 허브 — 여정 계열 · 상시 계열 (S-3 · ADR-122 후속).
//
// **`/home` 아래 두는 이유**(IA v2.1 §2.2): `/assessments` 로 최상위에 두면 `PROTECTED_PREFIXES` 에
//   항목이 하나 늘고 커버리지를 다시 증명해야 한다. 기존 접두사 안이면 자동으로 따라온다 —
//   **불변식 17(matcher 를 좁히지 말 것)을 건드리지 않는 배치다.**
//
// **고지는 동의가 아니다**(IA §4.2 ①). 상시 체크를 시작할 때 열람 범위를 한 줄로 알린다 —
//   허락을 구하는 문장이 아니라 알려 주는 문장이고, **동의 토글을 두지 않는다.**
//   차수 회원과 개인 회원의 문장이 다른 이유는 실제로 보는 사람이 다르기 때문이다.
//
// **참여자 화면 규율**(불변식 9·11 · 발주서 §7.3): 경고색·순위·막대 0.
//   자격이 없어 닫힌 항목은 **색이 아니라 문장**으로 말한다.
//
// **4차 F-4 에서 보이는 층을 시안 F 로 교체했다.** 게이트·항목 판정·고지 분기는 그대로다 —
//   바뀐 것은 그릇뿐이고, 시안의 `완료`·`대기` 도 **색이 아니라 낱말**로 든다.
import { redirect } from 'next/navigation';
import { createServerContext } from '@/core/supabase/server';
import { AssessmentsScreen, type AssessSection } from './AssessmentsScreen';
import { assessmentAccess } from '@/app/_lib/assessmentAccess';
import { TOOL } from '@/app/_vocab/tool';
import { VALUE_TOOL } from '@/instruments/futurenow/values/copy';

export const dynamic = 'force-dynamic';

export default async function AssessmentsPage() {
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  // ★ **되돌릴 때 `returnTo` 를 단다**(ADR-175). 없으면 로그인 화면에 **갇힌다** —
  //   로그인 직후 세션이 서버에 닿기 전 이 화면이 미인증으로 보고 되돌리는데,
  //   갈 곳을 안 적으면 되돌아올 길이 없다. `/feed` 는 처음부터 달고 있었고 그래서 멀쩡했다.
  //   **실측 2026-09-02**: `returnTo=/home/assessments` 로 로그인하면 60초에도 못 들어갔다.
  //   같은 화면이 직접 열기 0.6초 · 로그인 뒤 링크 이동 0.6초로 멀쩡했다.
  if (!me) redirect('/login?returnTo=/home/assessments');

  // **화면 게이트를 걷었다**(최박사 확정 2026-08-30).
  //
  //   최박사 말씀: *"퓨처나우 메인 서비스 입장에서는 해당 메뉴 클릭을 막을 이유가 없다.
  //   각 도구 진입을 막지는 말고, 진입하는 사람이 어떤 자격자인지만 패러미터가 넘어가면 된다."*
  //
  //   **옛 게이트가 열람까지 막고 있었다.** 종료된 회기 참여자는 `pending` 이 되어
  //   `standing`·`journey` 둘 다 불가라 이 자리에서 `/pending` 으로 튕겼고,
  //   **자기 검사 데이터를 보러 들어갈 문이 그 문 하나뿐**이었다.
  //   최박사 모델은 *본인의 검사데이터는 볼 수 있지만 신규검사는 안 됨* 이므로 어긋난다.
  //
  //   **걷어도 안전하다** — 화면은 전 항목을 그리고 링크만 `undefined` 가 되며,
  //   신규 응시의 진짜 강제는 RPC 안의 `member_can_assess`(→ `member_tool_access`)다.
  //   *화면에서 버튼을 감추는 것은 안전장치가 아니다*(발주서 §4.4)의 뒷면이다 —
  //   감추기를 걷어도 서버가 이미 막는다.
  //
  //   **잠금이 먼저 섰다**(`tests/toolGate.test.ts`) — 걷는 일과 잠금은 한 쌍이고
  //   서버 게이트가 유일한 방어선이 되므로 그 방어선에 강제가 있는지를 테스트가 잰다.
  const state = await ctx.getMyMemberState();

  const cohorts = await ctx.listMyCohorts();
  // 여정은 **활성 차수**에만 붙는다. 마감된 기수는 여정이 끝났고 상시만 남는다.
  const active = cohorts.filter((c) => c.status === 'active');
  const pre = active.find((c) => !c.preDone) ?? null;
  const post = active.find((c) => c.postOpened && !c.postDone) ?? null;

  // 가치 카드는 **소속으로 갈린다** — 차수가 있으면 그 차수 경로, 없으면 개인 경로(S-2).
  //   차수가 여럿이면 첫 활성 차수로 보낸다(차수별 결과가 따로 서므로 임의 선택이 아니라 '지금 그 기수').
  const valueCohort = active[0] ?? null;
  const valueHref = valueCohort ? `/my/cohorts/${valueCohort.cohortId}/values` : '/my/values';
  const canStanding = assessmentAccess(state, 'standing');
  const canJourney = assessmentAccess(state, 'journey');

  // ── F-4 표시 자료 — 위 게이트·판정에는 손대지 않았다. ─────────────────────
  const sections: AssessSection[] = [
    {
      title: '여정 진단',
      desc: valueCohort?.name ?? '기수와 함께 걷는 동안 두 번',
      items: [
        {
          key: 'pre',
          icon: 'pre',
          title: TOOL.pre,
          note: !canJourney ? '기수에 속하면 열립니다.'
            : pre ? `${pre.name} · 아직 하지 않으셨어요.`
            : '이미 마치셨어요.',
          status: !canJourney ? undefined : pre ? '시작' : '완료',
          href: canJourney && pre ? `/join?cohort=${pre.cohortId}` : undefined,
        },
        {
          key: 'post',
          icon: 'post',
          title: TOOL.post,
          // 아직 열리지 않은 것과 없는 것은 다르므로 **언제 열리는지**를 말한다.
          note: post ? `${post.name} · 지금 하실 수 있어요.` : '6회차를 마친 뒤 열립니다.',
          status: post ? '시작' : '대기',
          href: post ? `/join?cohort=${post.cohortId}&wave=post` : undefined,
        },
      ],
    },
    {
      title: '상시 진단',
      desc: '언제든',
      items: [
        {
          key: 'value',
          icon: 'value',
          title: VALUE_TOOL,
          note: canStanding ? (valueCohort ? valueCohort.name : '나 혼자 합니다.') : '승인이 끝나면 열립니다.',
          status: canStanding ? '시작' : '대기',
          href: canStanding ? valueHref : undefined,
        },
        // 그림자 = SAIL. **연결만 한다** — 스키마·데이터·코드 무접촉(CLAUDE §4 · IA §4.5).
        //   연결 주소가 저장소 어디에도 없어 링크를 걸지 않았다. 임의로 만들지 않는다.
        { key: 'shadow', icon: 'shadow', title: '그림자', note: '곧 이 자리에서 이어집니다.', status: '대기' },
        { key: 'love', icon: 'love', title: '사랑의 언어', note: '준비하고 있습니다.', status: '대기' },
      ],
    },
  ];


  return (
    <AssessmentsScreen
      heading={{ title: '진단', lead: '현재의 나를 살피고, 다음 선택의 기준을 찾는 도구입니다.' }}
      sections={sections}
      // 열람 고지 — **동의가 아니라 알림**(IA §4.2 ①). 토글을 두지 않는다.
      //   차수 회원과 개인 회원의 문장이 다른 이유는 실제로 보는 사람이 다르기 때문이다.
      privacy={
        valueCohort ? (
          <><b>이 결과는 우리 기수 인도자와 함께 봅니다.</b> 다음 만남의 질문과 실행을 정하는 데 사용합니다.</>
        ) : (
          <><b>이 결과는 나만 봅니다.</b> 다음 선택의 기준을 찾는 데 사용합니다.</>
        )
      }
    />
  );
}
