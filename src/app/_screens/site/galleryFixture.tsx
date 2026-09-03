// 부품 전시용 표시 데이터 (4차 F-1).
//
// **문안은 시안 문구를 placeholder 로 넣는다**(발주 §2) — 문안 확정은 F-2 몫이고 부품은 슬롯만 갖는다.
// **전시 화면(`/preview/site`)과 스크린샷 하네스가 이 한 곳을 함께 쓴다** — 둘이 다른 데이터를 쓰면
//   캡처와 육안 확인이 다른 것을 보게 된다(사본이 둘).
import type { GrowAxisRow } from './GrowAxis';
import type { BandCard } from './CardBand3';
import type { WeekCell } from './WeekTimeline';
import type { QuickTile } from './QuickTiles';
import type { SessionChip } from './SessionChipStrip';
import type { MenuGroup } from './MenuSheet';
import type { GnbItem } from './SiteGnb';
import { LIBRARY_NAME } from '@/app/_vocab/library';

export const GNB_ITEMS: GnbItem[] = [
  { href: '/about', label: '소개' },
  { href: '/join', label: '신청' },
  { href: '/home/assessments', label: '진단' },
  { href: '/library', label: LIBRARY_NAME },
  { href: '/news', label: '소식' },
  { href: '/contact', label: '문의' },
];

export const GROW_ROWS: GrowAxisRow[] = [
  { letter: 'G', en: 'GOAL', ko: '과거와 미래의 나', note: '1-2회차' },
  { letter: 'R', en: 'REALITY', ko: '직면과 재구성', note: '3회차' },
  { letter: 'O', en: 'OPTIONS', ko: '펼치고 하나를 고른다', note: '4회차' },
  { letter: 'W', en: 'WILL', ko: '의지가 아니라 환경', note: '5회차' },
  { letter: '+F', en: 'FAITH', ko: '끝에서 오늘을 본다', note: '6회차' },
];

export const BAND_CARDS: BandCard[] = [
  { kicker: '무엇을', title: '설명하지 않고 쓰게 한다', body: '여섯 번의 자리에서 매번 손으로 남긴다.' },
  { kicker: '어떻게', title: '여섯 주의 궤적이 남는다', body: '갈무리가 쌓여 스스로 읽을 수 있는 기록이 된다.' },
  { kicker: '누구와', title: '같은 회기가 함께 걷는다', body: '매일의 걸음을 서로 본다. 순위는 없다.' },
];

export const WEEK_CELLS: WeekCell[] = [
  { n: '1회차', title: '미래의 나를 만나다', output: '갈망 거울' },
  { n: '2회차', title: '과거의 나를 읽다', output: '한 걸음' },
  { n: '3회차', title: '직면과 재구성', output: '되비추기' },
  { n: '4회차', title: '펼치고 고른다', output: '선택지' },
  { n: '5회차', title: '의지가 아니라 환경', output: '실행 설계' },
  { n: '6회차', title: '끝에서 오늘을 본다', output: '결산' },
];

export const QUICK_TILES: QuickTile[] = [
  { icon: 'checkin', title: '오늘의 갈무리', hint: '2회차', href: '/my/cohorts/demo/checkin/2' },
  { icon: 'mirror', title: '되비추기', hint: '나의 기록', href: '/my/cohorts/demo/journey' },
  { icon: 'feed', title: '동행', hint: '회기와 함께', href: '/feed' },
  { icon: 'library', title: LIBRARY_NAME, hint: '배포 자료', href: '/library' },
];

/** 네 상태를 한 줄에서 다 보이게 — 완료·진행·열림·잠금(감추지 않는다). */
export const CHIPS: SessionChip[] = [
  { no: 1, state: 'done', href: '#' },
  { no: 2, state: 'current', href: '#' },
  { no: 3, state: 'open', href: '#' },
  { no: 4, state: 'locked' },
  { no: 5, state: 'locked' },
  { no: 6, state: 'locked' },
];

export const MENU_GROUPS: MenuGroup[] = [
  { title: '여정', items: [{ href: '/my/cohorts', label: '내 회기' }, { href: '/feed', label: '동행' }] },
  { title: '진단', items: [{ href: '/home/assessments', label: '체크 허브' }, { href: '/my/values', label: '가치 카드' }] },
  { title: '자료', items: [{ href: '/library', label: LIBRARY_NAME }, { href: '/news', label: '소식' }] },
  { title: '계정', items: [{ href: '/account', label: '내 정보' }] },
];

export const SHEET = { name: '김서온', role: '참여자', cohort: '예봄 2기', groups: MENU_GROUPS, chips: CHIPS };
