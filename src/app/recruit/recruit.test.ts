import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isProtectedPath } from '@/proxy.guard';
import { CURRENT_INTAKE, STATUS_COPY, joinHref, type Intake } from './intake';
import {
  APPLY, AUDIENCE, FEE, HERO, JOURNEY, META, ONLINE, PROBLEM, RESULT, SCHEDULE, SITE_ORIGIN, TEAM, VOICES, WHAT,
} from './copy';

// 시안 HTML 이 최종 기준이다(지휘부 확정 2026-08-19). 랜딩 문구가 그것과 갈리면 같은 사람이 카드 이미지와
//   웹을 번갈아 보며 다른 말을 읽는다. 그래서 스냅샷을 따로 두지 않고 **시안 파일을 직접 읽어** 대조한다 —
//   시안이 고쳐지면 이 테스트가 먼저 레드가 되고, 문안을 함께 옮기라고 말한다.
//   (갈무리 쪽 copyRegression.test.ts 가 baseline JSON 을 쓰는 것과 다른 선택이다. 거기는 원본이 코드 안에 있고
//    여기는 코드 밖 문서가 원본이라, 사본을 하나 더 만들면 진실이 셋이 된다.)
const SIAN = readFileSync(
  resolve(process.cwd(), 'docs/tasks/예봄2기_카드뉴스_시안 (2).html'),
  'utf-8',
);

/** 시안 HTML 안에 이 문자열이 그대로 있는가. 마크업(<br>·<strong>)이 끼는 자리는 조각으로 나눠 확인한다. */
const inSian = (s: string) => SIAN.includes(s);

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
