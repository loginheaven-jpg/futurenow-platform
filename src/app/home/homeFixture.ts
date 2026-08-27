// 로그인 홈 표시 데이터 (4차 F-3) — **캡처와 테스트가 같은 한 곳을 쓴다.**
//
// 실제 값이 아니라 **모양을 보이기 위한 자료**다. 둘이 다른 데이터를 쓰면
//   캡처와 육안 확인이 서로 다른 것을 보게 된다(F-1 `galleryFixture` 와 같은 이유).
import type { MyCohortSummary } from '@/contracts';
import type { HomeScreenProps } from './HomeScreen';

export const HOME_COHORTS: MyCohortSummary[] = [
  {
    cohortId: 'c1', name: '예봄 2기', coachName: '이승은', status: 'active',
    preDone: true, postDone: false, postOpened: false,
    openSessionNo: 2, openSessionSubmitted: false, openSessionHasContent: false,
    joinedAt: '2026-09-01T00:00:00Z',
  },
];

export const HOME_FIXTURE: HomeScreenProps = {
  who: { name: '김서온', role: '참여자', cohort: '예봄 2기' },
  role: {
    badge: '예봄 2기', who: '참여자', title: '내 기수로 가기',
    sub: '2회차 갈무리가 열려 있습니다', href: '/my/cohorts/c1', ctaLabel: '기수 홈',
  },
  tiles: [
    { icon: 'checkin', title: '오늘의 갈무리', hint: '2회차', href: '/my/cohorts/c1/checkin/2' },
    { icon: 'mirror', title: '되비추기', hint: '나의 기록', href: '/my/cohorts/c1/journey' },
    { icon: 'feed', title: '동행', hint: '기수와 함께', href: '/feed' },
    { icon: 'library', title: '자료실', hint: '배포 자료', href: '/library' },
  ],
  news: [
    { id: 'n1', title: '2회차 준비물 안내', date: '8.20', href: '/news/n1' },
    { id: 'n2', title: '1기 수료 소식과 후기', date: '8.02', href: '/news/n2' },
  ],
  groups: [
    { title: '여정', items: [{ href: '/my/cohorts/c1', label: '내 기수' }, { href: '/feed', label: '동행' }] },
    { title: '진단', items: [{ href: '/home/assessments', label: '체크 허브' }, { href: '/my/values', label: '가치 카드' }] },
    { title: '자료', items: [{ href: '/library', label: '자료실' }, { href: '/news', label: '소식' }] },
    { title: '계정', items: [{ href: '/account', label: '내 정보' }] },
  ],
  /** 네 상태를 다 보인다 — 완료·진행·열림·잠금. 잠긴 회차를 감추지 않는다. */
  chips: [
    { no: 1, state: 'done', href: '/my/cohorts/c1/checkin/1' },
    { no: 2, state: 'current', href: '/my/cohorts/c1/checkin/2' },
    { no: 3, state: 'locked' }, { no: 4, state: 'locked' },
    { no: 5, state: 'locked' }, { no: 6, state: 'locked' },
  ],
};
