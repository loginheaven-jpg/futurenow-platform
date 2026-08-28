// `/join` 단계 크롬 — **라우트 하나에 화면이 여덟이라 표로 풀리지 않는 자리**(U-4 §1).
//
// `_lib/screenChrome` 는 **라우트의 성질**을 적는 표다. `/join` 은 URL 이 하나인데
//   단계마다 제목이 다르고 둘은 아예 헤더가 없다. 그래서 이 자리만 화면이 껍데기에게
//   알려 준다(`useSetChrome`) — 표를 이긴다.
//
// **여기 적힌 값은 전부 걷어 온 것이다.** U-1 보고 §5 가 인용한 그 줄들이고
//   `_screens/entry/*` 의 `<AppHeader …/>` 에서 그대로 옮겼다. 한 글자도 새로 짓지 않았다:
//     CodeInput      title="참여 코드"
//     CohortPreview  title={isGeneral ? TOOL.trial : '이 모임에 들어갑니다'}
//     AuthGate       title="들어가기"  onBack={() => setStep(meta ? 'preview' : 'code')}
//     StartGuide     title="잠깐, 호흡 한 번"      subtitle={cohortName}
//     ProfileForm    title="잠깐, 몇 가지만"       subtitle="응답을 더 깊이 읽기 위한 준비예요"
//
// **`null` 도 실측이다** — `resolving`·`runner`·`done` 은 **오늘 헤더가 없다.**
//   없던 자리에 제목을 만들어 넣지 않는다(그것이 문안을 짓는 일이다).
//
// **부제가 여기에는 있다.** §2 가 옮기지 말라 한 것은 **인도자 화면의 부제**(본문 첫 줄)이고,
//   이 둘은 **원래 헤더에 있던 부제**다. 옮기지 않는 것과 있던 것을 지키는 것은 같은 규율이다.
import { TOOL } from '@/app/_vocab/tool';

export type JoinStep = 'resolving' | 'code' | 'preview' | 'auth' | 'start' | 'profile' | 'runner' | 'done';

/** 뒤로는 **단계 이름**으로 적는다 — 함수를 표에 담으면 표가 상태를 알아야 한다. */
export interface JoinStepChrome {
  /** 옛 부품이 쓰던 값 그대로다 — 다섯 다 `sub` 였다(그래서 홈 아이콘이 섰다). */
  variant: 'sub';
  title: string;
  subtitle?: string;
  back?: JoinStep;
}

export function joinChrome(
  step: JoinStep,
  o: { isGeneral: boolean; cohortName?: string | null; hasMeta: boolean },
): JoinStepChrome | null {
  switch (step) {
    case 'code':
      return { variant: 'sub', title: '참여 코드' };
    case 'preview':
      return { variant: 'sub', title: o.isGeneral ? TOOL.trial : '이 모임에 들어갑니다' };
    case 'auth':
      return { variant: 'sub', title: '들어가기', back: o.hasMeta ? 'preview' : 'code' };
    case 'start':
      return { variant: 'sub', title: '잠깐, 호흡 한 번', subtitle: o.cohortName ?? undefined };
    case 'profile':
      return { variant: 'sub', title: '잠깐, 몇 가지만', subtitle: '응답을 더 깊이 읽기 위한 준비예요' };
    default:
      return null; // resolving · runner · done — 실측상 헤더가 없다
  }
}
