// 시안 C·F 표시 데이터 (4차 F-4) — **캡처와 테스트가 같은 한 곳을 쓴다.**
//   둘이 다른 데이터를 쓰면 캡처와 육안 확인이 서로 다른 것을 본다(`homeFixture` 와 같은 이유).
import type { CohortHomeScreenProps } from '@/app/(member)/my/cohorts/[cohortId]/CohortHomeScreen';
import type { AssessmentsScreenProps } from '@/app/(member)/home/assessments/AssessmentsScreen';
import { LIBRARY_NAME } from '@/app/_vocab/library';

// **`WHO`·`SHEET` 를 걷었다**(U-2 §3) — 시트 자료는 껍데기가 들고 화면이 나르지 않는다.

export const COHORT_FIXTURE: CohortHomeScreenProps = {
  head: { hello: '김서온 님의 여정', part: 'PART 1 · GOAL', title: '미래의 나를 만나다' },
  /** **막대가 아니라 점**이다 — 불변식 11(지휘부 판정 2026-08-27). */
  progress: { label: '7주 기록', cells: [true, false, false, false, false, false], done: 1, total: 6, cohortName: '예봄 2기' },
  today: {
    tag: '오늘의 갈무리',
    title: '2회차 — 미래의 나를 만나다',
    line: '9월 28일 밤까지 열려 있어요',
    cta: { href: '/my/cohorts/c1/checkin/2?edit=1', label: '쓰러 가기' },
  },
  rows: [
    { key: 'journey', title: '되비추기', note: '지난 회차 다시 보기', href: '/my/cohorts/c1/journey' },
    { key: 'feed', title: '동행 피드', note: '오늘의 걸음', href: '/feed?cohort=c1' },
    { key: 'report', title: '사전 체크 완료', note: '리포트 보기', href: '/my/cohorts/c1/report' },
    { key: 'library', title: LIBRARY_NAME, note: '배포 자료', href: '/library' },
  ],
};

export const ASSESS_FIXTURE: AssessmentsScreenProps = {
  heading: { title: '진단', lead: '나를 아는 도구들. 정답이 없고, 점수로 사람을 나누지 않습니다.' },
  sections: [
    {
      title: '여정 진단',
      desc: '예봄 2기',
      items: [
        { key: 'pre', icon: 'pre', title: '사전 체크', note: '이미 마치셨어요.', status: '완료', href: '/x' },
        { key: 'post', icon: 'post', title: '사후 체크', note: '6회차를 마친 뒤 열립니다.', status: '대기' },
      ],
    },
    {
      title: '상시 진단',
      desc: '언제든',
      items: [
        { key: 'value', icon: 'value', title: '가치 카드', note: '예봄 2기', status: '시작', href: '/y' },
        { key: 'shadow', icon: 'shadow', title: '그림자', note: '곧 이 자리에서 이어집니다.', status: '대기' },
        { key: 'love', icon: 'love', title: '사랑의 언어', note: '준비하고 있습니다.', status: '대기' },
      ],
    },
  ],
  privacy: <><b>이 결과는 우리 기수 인도자와 함께 봅니다.</b> 다음 만남의 질문과 실행을 정하는 데 사용합니다.</>,
};

/**
 * 본부 멤버 관리 픽스처 — **회원 상태 다섯을 한 화면에 세운다**(5-3).
 *
 * `/admin` 은 QA 계정이 코치라 실라우트로 못 찍는다(두 회차 연속 미실측이었다).
 * **인증 흐름은 이미 검증됐다** — U-3 에서 코치가 `/admin` 에 가면 `/coach` 로 착지하는 것을 봤고
 * 그것이 게이트가 작동한다는 증거다. **남은 것은 레이아웃뿐**이므로 표시 층을 SSR 로 그려 찍는다.
 *
 * ⚠ **픽스처 캡처는 레이아웃을 재지 인증 흐름을 재지 않는다.** 그 한계를 여기 적어 둔다.
 */
export const ADMIN_FIXTURE = {
  currentUserId: 'me',
  isSuperAdmin: false,
  members: [
    { id: 'me', email: 'me@t.test', name: '나(운영자)', role: 'admin' as const, memberState: 'individual' as const, isSuperAdmin: false },
    { id: 'sa', email: 'super@t.test', name: '슈퍼어드민', role: 'admin' as const, memberState: 'pending' as const, isSuperAdmin: true },
    { id: 'c1', email: 'coach@t.test', name: '김인도', role: 'coach' as const, memberState: 'cohort' as const, isSuperAdmin: false },
    { id: 'u1', email: 'a@t.test', name: '이참여', role: 'user' as const, memberState: 'individual' as const, isSuperAdmin: false },
    { id: 'u2', email: 'b@t.test', name: '박대기', role: 'user' as const, memberState: 'pending' as const, isSuperAdmin: false },
    { id: 'u3', email: 'c@t.test', name: '최보류', role: 'user' as const, memberState: 'expired' as const, isSuperAdmin: false },
    { id: 'u4', email: 'd@t.test', name: '정확인', role: 'user' as const, memberState: 'held' as const, isSuperAdmin: false },
  ],
};
