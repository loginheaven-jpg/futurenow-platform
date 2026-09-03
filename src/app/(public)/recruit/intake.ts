// 모집 랜딩(/recruit)이 바라보는 **현재 회기** — 회기가 바뀔 때 고치는 유일한 파일이다.
//
// 왜 상수인가(DB 아님): 이 페이지는 공개 정적 화면이고, 모집 기간에 값이 스스로 변하지 않는다.
//   회기를 DB에서 읽으면 랜딩이 요청마다 동적이 되고(캐시 못 함) 마감 스위치도 운영 화면을 먼저 지어야 한다.
//   운영 데이터(발주서 S-3)가 붙으면 이 상수의 자리를 그때 넘겨받는다 — 타입은 그대로 두었다.
//
// 왜 한 파일에 몰았나: 지휘부 지시가 "회기마다 가입링크 부분만 바꿔서 쓰는 공용 페이지"였다.
//   링크만 상수로 빼면 일정·참가비·마감일이 본문에 박혀 3기 때 문안을 헤집게 된다.
//   그래서 **회기마다 달라지는 값 전부**를 여기 모았다. copy.ts 에 남긴 것은 회기와 무관한 문장뿐이다.

/** 모집 상태. 발주서 §3.5 — 인도자가 수동으로 넘긴다(자동 마감 없음). */
export type IntakeStatus = 'open' | 'closed' | 'ended';

export type ScheduleRow = {
  /** 회차 표시(예 '1회') */ no: string;
  /** 날짜 표시(예 '9월 20일 (일)') */ date: string;
  /** 시간 표시(예 '오후 3시') */ time: string;
  /** 장소명 */ place: string;
  /** 지역 — 장소명보다 작게 붙는다(원고 카드 10 주기). 없으면 생략 */ area?: string;
};

export type Intake = {
  code: string;
  label: string;
  status: IntakeStatus;
  coverLine: string;
  capacity: string;
  /** 정원(숫자). capacity 문자열과 어긋나지 않도록 recruit.test.ts 가 둘을 묶는다. */
  seats: number;
  /**
   * 남은 자리를 **몇 명부터 보여 줄 것인가.** 신청이 이 수에 못 미치면 그 줄을 그리지 않는다.
   *
   * 모집 첫날의 `남은 자리 9` 는 없느니만 못하다 — 사회적 증거가 되라고 붙인 줄이
   * 오히려 '아무도 안 하네'를 말한다. 0 으로 두면 처음부터 보인다.
   */
  showSeatsFrom: number;
  deadlineLine: string;
  fee: string;
  scholarship: string;
  scholarshipNote: string;
  criteria: string[];
  accountLabel: string;
  accountText: string;
  /** 복사 버튼이 클립보드에 넣는 값 — 은행명·예금주를 뺀 번호만. 붙여넣는 곳이 이체 화면이다. */
  accountNumber: string;
  schedule: ScheduleRow[];
  sessionLength: string;
};

export const CURRENT_INTAKE: Intake = {
  // ── 회기를 바꾸려면 여기부터 ────────────────────────────────
  code: 'ZR4KB', // cohorts.code — CTA 가 /join?code= 로 물고 간다
  label: '예봄 2기',
  status: 'open',
  // ───────────────────────────────────────────────────────────

  coverLine: '예봄 2기 · 6주 · 회당 140분',
  capacity: '선착순 10명',
  seats: 10,
  // 인원은 손으로 적지 않는다 — DB 가 센다(seats.ts · cohort_seats_taken).
  //   운영자 제외는 role='user' 로 걸러진다: 2026-08-24 실측에서 2기 등록 7명 중 완료 6명이나
  //   최철영(coach)·이승은(admin)이 세미나 운영자여서 실제 신청자는 5명이다.
  //   **이름이 아니라 역할로 거른다** — 이름 목록은 운영자가 바뀔 때마다 낡는다.
  showSeatsFrom: 3,
  deadlineLine: '선착순 10명 · 9월 6일(일) 마감',

  fee: '25만원',
  scholarship: '6회차 개근하시면 장학금 20만원!',
  scholarshipNote: '예봄 2기 한정 · 6회차 종료 후 지급',
  criteria: [
    '해당 회차 참석 + 갈무리 기록 완료',
    '결석은 2회까지 녹음 청취와 추가 과제·리포트로 대체 가능',
  ],

  accountLabel: '입금 계좌',
  accountText: '우리은행 176-179666-02-001 (예금주 이승은)',
  accountNumber: '176-179666-02-001',

  schedule: [
    { no: '1회', date: '9월 20일 (일)', time: '오후 3시', place: '예봄교회', area: '판교' },
    { no: '2회', date: '9월 28일 (월)', time: '저녁 8시', place: 'ZOOM' },
    { no: '3회', date: '10월 5일 (월)', time: '저녁 8시', place: 'ZOOM' },
    { no: '4회', date: '10월 12일 (월)', time: '저녁 8시', place: 'ZOOM' },
    { no: '5회', date: '10월 18일 (일)', time: '오후 3시', place: '예봄교회', area: '판교' },
    { no: '6회', date: '10월 25일 (일)', time: '오후 4시', place: '로벤하임', area: '동대문' },
  ],
  sessionLength: '회당 140분',
};

/**
 * 남은 자리 — 화면에 그릴 수 있으면 숫자를, 아니면 null.
 * DB 호출과 분리된 **순수 함수**라 경계 조건을 테스트로 잠글 수 있다.
 *
 * 정원이 차도 0 밑으로 내려가지 않고 CTA 도 막지 않는다(발주서 §4.3 — 자동 마감을 넣지 않는다).
 * 마감·종료 상태에서는 아예 그리지 않는다 — 그때는 무의미한 정보다.
 */
export function seatsRemaining(taken: number | null, open: boolean, intake: Intake = CURRENT_INTAKE): number | null {
  if (taken == null || !open) return null;
  if (taken < intake.showSeatsFrom) return null;
  return Math.max(0, intake.seats - taken);
}

/** 신청 흐름 진입 주소. 랜딩은 이 링크만 밖으로 내보낸다 — 사전 체크로 직행하는 주소를 따로 배포하지 않는다. */
export function joinHref(intake: Intake = CURRENT_INTAKE): string {
  return `/join?code=${encodeURIComponent(intake.code)}`;
}

/**
 * 상태별 배지·CTA 문구. 발주서 §3.5 는 "마감 안내 문구는 확정 전이니 자리만 만들고 문자열은 상수로 뺀다"고 했다 —
 * closed·ended 문안은 지휘부가 확정하면 이 표만 고친다. 경고색은 쓰지 않는다(§3.4·§0.4 담담한 안내).
 */
export const STATUS_COPY: Record<IntakeStatus, { badge: string | null; cta: string; note: string; enabled: boolean }> = {
  open: {
    badge: '선착순 10명',
    cta: '사전 체크 시작하기',
    note: '약 10분 걸립니다. 마치시면 신청이 완료됩니다.',
    enabled: true,
  },
  closed: {
    badge: '마감되었습니다',
    cta: '모집이 마감되었습니다',
    note: '다음 회기 소식을 준비하고 있습니다.',
    enabled: false,
  },
  ended: {
    badge: null,
    cta: '이번 회기는 끝났습니다',
    note: '다음 회기 소식을 준비하고 있습니다.',
    enabled: false,
  },
};
