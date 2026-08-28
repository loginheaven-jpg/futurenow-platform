import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isProtectedPath } from '@/proxy.guard';
import { CHECKIN_SESSION_1 } from '@/instruments/futurenow/checkin/session1';
import { CURRENT_INTAKE, STATUS_COPY, joinHref, seatsRemaining, type Intake } from './intake';
import {
  APPLY, AUDIENCE, FEE, HERO, JOURNEY, META, ONLINE, PROBLEM, RESULT, SCHEDULE, SEATS_LEFT, SITE_ORIGIN, TEAM, VOICES, WHAT,
} from './copy';

// 시안 HTML 이 최종 기준이다(지휘부 확정 2026-08-19). 랜딩 문구가 그것과 갈리면 같은 사람이 카드 이미지와
//   웹을 번갈아 보며 다른 말을 읽는다. 그래서 스냅샷을 따로 두지 않고 **시안 파일을 직접 읽어** 대조한다 —
//   시안이 고쳐지면 이 테스트가 먼저 레드가 되고, 문안을 함께 옮기라고 말한다.
//   (갈무리 쪽 copyRegression.test.ts 가 baseline JSON 을 쓰는 것과 다른 선택이다. 거기는 원본이 코드 안에 있고
//    여기는 코드 밖 문서가 원본이라, 사본을 하나 더 만들면 진실이 셋이 된다.)
// **줄끝을 정규화한다.** 이 저장소는 `core.autocrlf=true` 라 Windows 에서 클론하면 문서가 CRLF 로 풀린다.
//   Node 는 원본 바이트를 그대로 읽으므로, 여러 줄 문구(`title.join('<br>')` 이 만드는 개행)를
//   CRLF 문서에서 찾으면 **문구가 맞는데도 레드가 난다.** 지휘부가 매 단계 클론해 감리하므로 그 자리에서 먼저 터진다.
const LF = (s: string) => s.split('\r\n').join('\n');

const SIAN = LF(
  readFileSync(resolve(process.cwd(), 'docs/tasks/예봄2기_카드뉴스_시안 (2).html'), 'utf-8'),
);

/** 시안 HTML 안에 이 문자열이 그대로 있는가. 마크업(<br>·<strong>)이 끼는 자리는 조각으로 나눠 확인한다. */
const inSian = (s: string) => SIAN.includes(s);

// 원고 .md — 셋째 사본이다. 이미지(시안) · 웹(copy.ts) · 원고 셋이 일치해야 한다는 것이 지휘부 요구다.
//   원고는 참여자가 읽는 화면이 아니지만 3기 준비에 다시 열어 보는 문서이고, 옛 문구가 남아 있으면
//   그때 어느 쪽이 맞는지 매번 대조해야 한다. 그래서 대조 범위에 넣는다.
//   원고는 마크다운이라 **강조**와 줄바꿈이 시안의 <strong>·<br> 자리에 온다 — 그것만 맞춰 비교한다.
const WONGO = LF(
  readFileSync(resolve(process.cwd(), 'docs/tasks/예봄2기_모집카드뉴스_원고_확정 (1).md'), 'utf-8'),
).replace(/\*\*/g, '');
const inWongo = (s: string) => WONGO.includes(s.replace(/<br>/g, '\n').replace(/<\/?strong>/g, ''));

describe('시안 HTML 이 문구의 최종 기준이다', () => {
  it('시안 파일을 읽었다 — 경로가 바뀌면 여기서 먼저 멈춘다', () => {
    expect(SIAN.length).toBeGreaterThan(10000);
    expect(SIAN).toContain('카드뉴스 검토 시안');
  });

  it('표지 · 문제제기 — 카드 1·2·3', () => {
    expect(inSian(HERO.title.join('<br>'))).toBe(true);
    expect(inSian(HERO.sub)).toBe(true);
    expect(inSian(PROBLEM.title.join('<br>'))).toBe(true);
    expect(inSian(PROBLEM.lead.join('<br>'))).toBe(true);
    expect(inSian(PROBLEM.emph)).toBe(true);
    expect(inSian(PROBLEM.title2.join('<br>'))).toBe(true);
    for (const m of PROBLEM.marks) expect(inSian(m), m).toBe(true);
    expect(inSian(PROBLEM.closing)).toBe(true);
    expect(inSian(PROBLEM.closingGold)).toBe(true);
  });

  it('무엇을 하는가 — 카드 4', () => {
    expect(inSian(WHAT.title.join('<br>'))).toBe(true);
    for (const d of WHAT.defs) expect(inSian(d.text), d.text).toBe(true);
    expect(inSian(WHAT.lead)).toBe(true);
    expect(inSian(WHAT.leadEmph)).toBe(true);
    expect(inSian(WHAT.modelLabel)).toBe(true);
    expect(inSian(WHAT.modelWords)).toBe(true);
    expect(inSian(WHAT.foot)).toBe(true);
  });

  it('여섯 번의 작업 — 카드 5. 여섯 행이 하나도 빠지지 않았다', () => {
    expect(JOURNEY.rows).toHaveLength(6);
    for (const r of JOURNEY.rows) expect(inSian(r.what), r.what).toBe(true);
    expect(inSian(JOURNEY.foot)).toBe(true);
  });

  it('손에 남는 것 — 카드 6. 강조 구간까지 원문대로', () => {
    expect(RESULT.marks).toHaveLength(6);
    for (const m of RESULT.marks) {
      expect(inSian(`${m.pre}<strong>${m.strong}</strong>${m.post}`), m.strong).toBe(true);
    }
    expect(inSian(RESULT.foot)).toBe(true);
  });

  it('1기 참여자의 말 — 카드 7. 인용은 셋이고 각각 화자가 붙는다', () => {
    expect(VOICES.quotes).toHaveLength(3);
    for (const q of VOICES.quotes) {
      expect(inSian(q.text), q.text.slice(0, 20)).toBe(true);
      expect(inSian(q.cite)).toBe(true);
    }
  });

  it('온라인 동행 — 카드 8', () => {
    for (const b of ONLINE.blocks) {
      expect(inSian(b.head), b.head).toBe(true);
      expect(inSian(b.body), b.head).toBe(true);
    }
    expect(inSian(ONLINE.foot)).toBe(true);
  });

  it('이런 분께 — 카드 9. 다섯 항목', () => {
    expect(AUDIENCE.marks).toHaveLength(5);
    for (const m of AUDIENCE.marks) expect(inSian(m), m).toBe(true);
  });

  it('일정 — 카드 10. 여섯 회차의 날짜·시간·장소가 전부 시안과 같다', () => {
    expect(SCHEDULE.title).toBe('현장 3회 + 온라인 3회');
    expect(inSian(SCHEDULE.title)).toBe(true);
    expect(CURRENT_INTAKE.schedule).toHaveLength(6);
    for (const r of CURRENT_INTAKE.schedule) {
      expect(inSian(r.date), r.date).toBe(true);
      expect(inSian(r.time), r.time).toBe(true);
      expect(inSian(r.place), r.place).toBe(true);
      if (r.area) expect(inSian(`(${r.area})`), r.area).toBe(true);
    }
    expect(inSian(CURRENT_INTAKE.sessionLength)).toBe(true);
  });

  it('참가비 — 카드 11. 금액·장학금·개근 기준·표어·계좌', () => {
    expect(inSian(CURRENT_INTAKE.fee)).toBe(true);
    expect(inSian(CURRENT_INTAKE.scholarship)).toBe(true);
    expect(inSian(CURRENT_INTAKE.scholarshipNote)).toBe(true);
    expect(inSian(FEE.criteriaHead)).toBe(true);
    expect(inSian(CURRENT_INTAKE.criteria.join('<br>'))).toBe(true);
    expect(inSian(FEE.motto)).toBe(true);
    expect(inSian(FEE.foot)).toBe(true);
  });

  it('계좌 문자열이 시안과 한 글자도 다르지 않다 — 틀리면 돈이 다른 곳으로 간다', () => {
    expect(inSian(CURRENT_INTAKE.accountText)).toBe(true);
    // 복사값은 번호만이고, 그 번호가 표시 문자열 안에 실제로 들어 있어야 한다
    expect(CURRENT_INTAKE.accountText).toContain(CURRENT_INTAKE.accountNumber);
  });

  it('기획 및 진행 — 카드 12. 학교명 축약(지휘부 2026-08-19)이 반영돼 있다', () => {
    for (const p of TEAM.people) {
      expect(inSian(p.name), p.name).toBe(true);
      expect(inSian(p.role), p.role).toBe(true);
    }
    expect(TEAM.people[1].bio).toContain('상담학 석사');
    expect(TEAM.people[1].bio).not.toContain('한국상담대학원대학교');
    expect(SIAN).not.toContain('한국상담대학원대학교');
  });

  it('신청 — 카드 13', () => {
    expect(inSian(APPLY.body)).toBe(true);
    expect(inSian(APPLY.bodyEmph)).toBe(true);
    expect(inSian(APPLY.deadlineNote)).toBe(true);
    expect(inSian(CURRENT_INTAKE.deadlineLine)).toBe(true);
  });
});

// 이 페이지의 존재 이유는 "기수마다 가입링크만 갈아 끼워 쓰는 공용 페이지"다(지휘부 2026-08-19).
//   그 약속이 말로만 남지 않게 **3기를 가정한 상수로 갈아 끼워** 결과가 따라 바뀌는지 본다.
describe('기수 교체 — 상수 하나로 갈린다', () => {
  const 삼기: Intake = { ...CURRENT_INTAKE, code: 'AB9CD', label: '예봄 3기' };

  it('CTA 링크가 상수의 code 를 따라간다', () => {
    expect(joinHref(CURRENT_INTAKE)).toBe('/join?code=ZR4KB');
    expect(joinHref(삼기)).toBe('/join?code=AB9CD');
  });

  it('링크는 /join 으로 간다 — 랜딩은 사전 체크 주소를 따로 내보내지 않는다', () => {
    expect(joinHref(삼기).startsWith('/join?code=')).toBe(true);
  });

  it('코드가 URL 로 안전하게 인코딩된다', () => {
    expect(joinHref({ ...CURRENT_INTAKE, code: 'A B&C' })).toBe('/join?code=A%20B%26C');
  });

  // 코드가 문구 상수(copy.ts)에 새어 들어가면 상수를 바꿔도 화면 어딘가는 옛 기수를 가리킨다.
  it('기수 고유값이 문구 상수에 하드코딩돼 있지 않다', () => {
    const 문구 = JSON.stringify([HERO, PROBLEM, WHAT, JOURNEY, RESULT, VOICES, ONLINE, AUDIENCE, SCHEDULE, FEE, TEAM, APPLY]);
    expect(문구).not.toContain(CURRENT_INTAKE.code);
    expect(문구).not.toContain(CURRENT_INTAKE.accountNumber);
    expect(문구).not.toContain('9월 6일');
    expect(문구).not.toContain('25만원');
    for (const r of CURRENT_INTAKE.schedule) expect(문구, r.date).not.toContain(r.date);
  });
});

// 정원 표시는 **두 표현**(문자열 capacity · 숫자 seats)을 갖는다 — 둘이 어긋나면 화면이 자기와 모순된다.
//   인원은 손으로 적지 않는다: DB 의 cohort_seats_taken 이 세고(등록 + 사전 체크 완료 + role='user'),
//   판정만 순수 함수로 떼어 여기서 잠근다. 집계와 판정을 나눠야 경계 조건을 테스트할 수 있다.
describe('남은 자리 (ADR-110)', () => {
  it('정원 숫자와 정원 문구가 어긋나지 않는다', () => {
    expect(CURRENT_INTAKE.capacity).toContain(String(CURRENT_INTAKE.seats));
    expect(STATUS_COPY.open.badge).toContain(String(CURRENT_INTAKE.seats));
  });

  it('신청 수를 빼서 남은 자리를 낸다', () => {
    expect(seatsRemaining(5, true)).toBe(5);
    expect(seatsRemaining(9, true)).toBe(1);
  });

  // 집계가 실패하면 그 줄을 안 그린다 — 카운터 때문에 모집 페이지를 잃지 않는다.
  it('집계 실패(null)면 그리지 않는다', () => {
    expect(seatsRemaining(null, true)).toBeNull();
  });

  // 모집 첫날의 '남은 자리 9' 는 없느니만 못하다 — 사회적 증거가 되라고 붙인 줄이 반대로 말한다.
  it('임계 미만이면 감춘다', () => {
    expect(CURRENT_INTAKE.showSeatsFrom).toBe(3);
    expect(seatsRemaining(2, true)).toBeNull();
    expect(seatsRemaining(3, true)).toBe(7);
  });

  // 정원이 차도 CTA 는 막지 않는다(발주서 §4.3 — 자동 마감 없음). 0 밑으로도 내려가지 않는다.
  it('정원을 넘겨도 0 에서 멈춘다', () => {
    expect(seatsRemaining(10, true)).toBe(0);
    expect(seatsRemaining(12, true)).toBe(0);
  });

  it('마감·종료 상태에서는 아예 그리지 않는다 — 그때는 무의미한 정보다', () => {
    expect(seatsRemaining(5, false)).toBeNull();
    expect(STATUS_COPY.closed.enabled).toBe(false);
    expect(STATUS_COPY.ended.enabled).toBe(false);
  });

  it('남은 자리 문구는 줄어드는 방향으로 적는다', () => {
    expect(SEATS_LEFT(5)).toBe('남은 자리 5');
    expect(SEATS_LEFT(0)).toBe('남은 자리 0');
  });

  // 3기가 오면 정원이 달라질 수 있다 — 상수를 갈아 끼우면 판정이 따라온다.
  it('정원이 바뀌면 남은 자리도 따라 바뀐다', () => {
    const 삼기: Intake = { ...CURRENT_INTAKE, seats: 12 };
    expect(seatsRemaining(5, true, 삼기)).toBe(7);
  });
});

describe('마감 상태 — 세 갈래가 상수에서 나온다 (발주서 §3.5)', () => {
  it('모집 중일 때만 CTA 가 살아 있다', () => {
    expect(STATUS_COPY.open.enabled).toBe(true);
    expect(STATUS_COPY.closed.enabled).toBe(false);
    expect(STATUS_COPY.ended.enabled).toBe(false);
  });

  it('종료 상태에는 정원 배지를 걸지 않는다', () => {
    expect(STATUS_COPY.open.badge).toBe('선착순 10명');
    expect(STATUS_COPY.closed.badge).toBe('마감되었습니다');
    expect(STATUS_COPY.ended.badge).toBeNull();
  });

  it('세 갈래 모두 문구가 비어 있지 않다 — 자리만 만들어 두고 빈 화면을 내보내지 않는다', () => {
    for (const k of ['open', 'closed', 'ended'] as const) {
      expect(STATUS_COPY[k].cta.length, k).toBeGreaterThan(0);
      expect(STATUS_COPY[k].note.length, k).toBeGreaterThan(0);
    }
  });

  it('CTA 보조 문구는 발주서 §3.3 원문이다', () => {
    expect(STATUS_COPY.open.note).toBe('약 10분 걸립니다. 마치시면 신청이 완료됩니다.');
    expect(STATUS_COPY.open.cta).toBe('사전 체크 시작하기');
  });
});

describe('참여자 표면 금지어', () => {
  // 시안 HTML 이 의도적으로 쓰는 낱말은 예외다 — 카드 6·11 의 '워크북'(교재 안내라 대체어가 없다),
  //   카드 8 의 '사전 체크'(S-1 이 확정한 명칭이라 '진단'을 대체한 쪽이다).
  const BANNED = ['설문', '자기진단', '진단', '평가', '점수', '지각', '미제출', '함정'];

  it('랜딩 문구 어디에도 없다', () => {
    const 전문 = JSON.stringify([HERO, PROBLEM, WHAT, JOURNEY, RESULT, VOICES, ONLINE, AUDIENCE, SCHEDULE, FEE, TEAM, APPLY, META, CURRENT_INTAKE, STATUS_COPY]);
    for (const w of BANNED) expect(전문, w).not.toContain(w);
  });

  it("'워크북' 은 예외다 — 시안이 교재 안내로 쓴다", () => {
    expect(RESULT.foot).toContain('워크북');
    expect(FEE.foot).toContain('워크북');
  });
});

describe('메타 — 카톡 링크 미리보기 (발주서 §3.7)', () => {
  it('제목·설명이 발주서 원문이다', () => {
    expect(META.title).toBe('퓨처나우 예봄 2기 참가 신청');
    expect(META.description).toBe('꿈꾸는 미래를 지금 살자 — 6주 셀프코칭 세미나. 선착순 10명.');
  });

  it('metadataBase 가 절대 URL 이다 — 없으면 미리보기 이미지가 localhost 를 가리킨다', () => {
    expect(() => new URL(SITE_ORIGIN)).not.toThrow();
    expect(SITE_ORIGIN.startsWith('https://')).toBe(true);
  });
});

describe('공개 라우트다 — 로그인 벽 뒤에 갇히면 모집이 통째로 죽는다', () => {
  it('/recruit 는 보호 대상이 아니다', () => {
    expect(isProtectedPath('/recruit')).toBe(false);
  });

  it('CTA 가 가리키는 /join 도 공개다 — 눌렀는데 로그인부터 뜨면 첫 접촉에서 끊긴다', () => {
    expect(isProtectedPath('/join')).toBe(false);
  });

  // 보호 목록에 넣는 것은 지금 구조에서 한 줄이라, 실수로 들어가도 눈에 안 띈다. 그 한 줄을 여기서 막는다.
  it('보호 목록에 recruit 접두사가 생기지 않았다', () => {
    expect(isProtectedPath('/recruit/anything')).toBe(false);
  });
});

// 지휘부 요구(2026-08-19): "이미지, 원고, 웹 모두 일치되도록 하세요."
//   위 '시안 HTML 이 문구의 최종 기준이다' 블록이 시안 ↔ 웹을 잠갔다. 여기서 원고 ↔ 웹을 잠근다.
//   둘을 합치면 셋이 한자리에 묶인다 — 어느 하나만 고치면 반드시 레드가 난다.
//   웹(copy.ts)을 가운데 두고 양쪽을 확인하는 이유: copy.ts 는 이미 시안과 동일함이 증명됐으므로
//   원고 ⊇ copy.ts 이면 원고 == 시안이다. 대조를 두 번 쓰지 않아도 된다.
describe('원고 .md 가 시안·웹과 일치한다', () => {
  it('원고 파일을 읽었다 — 경로가 바뀌면 여기서 먼저 멈춘다', () => {
    expect(WONGO.length).toBeGreaterThan(5000);
    expect(WONGO).toContain('모집 카드뉴스');
  });

  it('원고는 더 이상 자기가 최신이라고 말하지 않는다 — 서열이 뒤집힌 것을 문서가 안다', () => {
    expect(WONGO).toContain('문구의 최종 기준은 이 파일이 아니라');
    expect(WONGO).not.toContain('이 파일이 최신이며');
  });

  it('카드 1~4 문안', () => {
    expect(inWongo(HERO.title.join('<br>'))).toBe(true);
    expect(inWongo(HERO.sub)).toBe(true);
    expect(inWongo(PROBLEM.title.join('<br>'))).toBe(true);
    expect(inWongo(PROBLEM.emph)).toBe(true);
    expect(inWongo(PROBLEM.title2.join('<br>'))).toBe(true);
    for (const m of PROBLEM.marks) expect(inWongo(m), m).toBe(true);
    expect(inWongo(PROBLEM.closing)).toBe(true);
    expect(inWongo(PROBLEM.closingGold)).toBe(true);
    expect(inWongo(WHAT.title.join('<br>'))).toBe(true);
    for (const d of WHAT.defs) expect(inWongo(`${d.term} : ${d.text}`), d.term).toBe(true);
    expect(inWongo(WHAT.leadEmph)).toBe(true);
    expect(inWongo(WHAT.foot)).toBe(true);
  });

  it('카드 5~9 문안', () => {
    for (const r of JOURNEY.rows) expect(inWongo(r.what), r.what).toBe(true);
    expect(inWongo(JOURNEY.foot)).toBe(true);
    for (const m of RESULT.marks) expect(inWongo(`${m.pre}${m.strong}${m.post}`), m.strong).toBe(true);
    expect(inWongo(RESULT.foot)).toBe(true);
    for (const q of VOICES.quotes) expect(inWongo(q.text), q.text.slice(0, 16)).toBe(true);
    for (const b of ONLINE.blocks) {
      expect(inWongo(b.head), b.head).toBe(true);
      expect(inWongo(b.body), b.head).toBe(true);
    }
    expect(inWongo(ONLINE.foot)).toBe(true);
    for (const m of AUDIENCE.marks) expect(inWongo(m), m).toBe(true);
  });

  it('카드 10~13 문안 — 일정·금액·계좌까지', () => {
    expect(inWongo(SCHEDULE.title)).toBe(true);
    for (const r of CURRENT_INTAKE.schedule) {
      expect(inWongo(r.date), r.date).toBe(true);
      expect(inWongo(r.place), r.place).toBe(true);
      if (r.area) expect(inWongo(`(${r.area})`), r.area).toBe(true);
    }
    expect(inWongo(CURRENT_INTAKE.fee)).toBe(true);
    expect(inWongo(CURRENT_INTAKE.scholarship)).toBe(true);
    expect(inWongo(FEE.motto)).toBe(true);
    expect(inWongo(FEE.foot)).toBe(true);
    expect(inWongo(CURRENT_INTAKE.accountText)).toBe(true);
    for (const p of TEAM.people) expect(inWongo(p.name), p.name).toBe(true);
    expect(inWongo(APPLY.body)).toBe(true);
    expect(inWongo(APPLY.deadlineNote)).toBe(true);
    expect(inWongo(CURRENT_INTAKE.deadlineLine)).toBe(true);
  });

  it('옛 문구가 원고에 남아 있지 않다 — 동기화 이전 판본의 흔적', () => {
    const 옛것 = [
      '의지가 약해서가 아니다.',
      '왜 하는지가 흐리다',
      '설계의 문제다.',
      '조감도는 짓기 전에 그리는 그림이다',
      '흐릿한 5년 뒤를 도면 수준으로',
      '건너뛰면 힘을 잃는다',
      '6주 뒤에 다시 펴 볼 물건이 남습니다',
      '잘 보이려는 답이 나오지 않도록',
      '인도자 한 사람만',
      '방향이 흐린 분',
      '다른 기준을 찾는 분',
      '재지 않은 변화는 없던 일이 된다',
      '첫 작업에서 시작한다',
      '여기 적은 것이 1회차의 첫 재료가 된다',
      '정원이 차면 조기 마감된다.',
      '한국상담대학원대학교',
    ];
    for (const o of 옛것) expect(WONGO, o).not.toContain(o);
  });
});

// ── 열람 범위 고지 — 모집 자료와 앱을 묶는다 ──────────────────────────────
//
// 네 번 보고된 드리프트다. 모집 자료가 `세미나 인도자만 봅니다` 라고 하는 동안 앱은
//   `인도자와 운영자만 봅니다` 라고 말하고 있었다(ADR-77 §4.3 이 열람 범위를 운영자 포함으로
//   확정하며 StartGuide·ResponseRunner·갈무리 notice2·동의서를 **정직하게 갱신한** 결과다).
//   **가입 전에 본 약속이 가입 시 동의서보다 좁았다.**
//
// 원인은 둘을 묶는 것이 아무것도 없었다는 데 있다. 모집 삼중 잠금(시안·원고·웹)은 서로만 봤고
//   앱 문안은 그 바깥이었다. 그래서 여기서 **앱의 갈무리 고지를 직접 읽어** 대조한다 —
//   한쪽이 바뀌면 다른 쪽을 함께 옮기라고 이 테스트가 먼저 말한다.
describe('열람 범위 고지가 앱 문안과 어긋나지 않는다 (ADR-77)', () => {
  const APP_NOTICE = CHECKIN_SESSION_1.save.notice2; // '적으신 내용은 인도자와 운영자가 읽습니다.'

  it('앱이 운영자를 명시한다 — 기준이 실재하는지 먼저 본다', () => {
    expect(APP_NOTICE).toContain('인도자');
    expect(APP_NOTICE).toContain('운영자');
  });

  it('모집 고지도 운영자를 명시한다', () => {
    expect(ONLINE.foot).toContain('인도자');
    expect(ONLINE.foot, '앱은 운영자도 본다고 말하는데 모집 자료가 인도자만이라 하면 약속이 두 곳에서 다르다').toContain('운영자');
  });

  it('옛 문구가 시안·원고·웹 어디에도 없다', () => {
    for (const src of [SIAN, WONGO, ONLINE.foot]) {
      expect(src).not.toContain('세미나 인도자만 봅니다');
    }
  });
});
