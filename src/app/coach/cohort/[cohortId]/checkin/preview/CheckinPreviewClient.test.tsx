import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CheckinCardClient } from '@/app/my/cohorts/[cohortId]/checkin/[session]/CheckinCardClient';
import { getCheckinSession } from '@/instruments/futurenow/checkin';
import { orderedSlots } from '@/instruments/futurenow/checkin/slots';
import { SAMPLE_BACK1, SAMPLE_BACK2 } from './CheckinPreviewClient';

// **배달 검증** — 선언이 아니라 화면에 닿았는지를 본다(ADR-109).
//   문안 대조·copyBaseline·금지어 검사는 셋 다 **선언된 문자열**만 본다. 그래서 심화 렌더가
//   placeholder 를 통째로 버리고 있어도 세 검사가 전부 통과했다. 그 사각지대를 여기서 막는다.
//
// 미리보기는 복제본이 아니라 **실제 CheckinCardClient 를 그대로 렌더**하므로(CheckinPreviewClient 머리말)
//   이 한 파일이 참여자 카드와 인도자 미리보기를 함께 잠근다.
//   preview 플래그가 자동저장·제출·사진 위젯을 막아 서버 쓰기 0이다.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const REGISTERED = Array.from({ length: 12 }, (_, i) => i + 1).filter((n) => getCheckinSession(n) !== null);

function card(sessionNo: number, withPrior: boolean): string {
  return renderToStaticMarkup(
    <CheckinCardClient
      cohortId="preview-cohort"
      sessionNo={sessionNo}
      userId="preview"
      initialAnswers={{}}
      initialFlags={{ suggestionAnon: false, contactRequest: false, deepOpened: false, stepPrivate: false }}
      alreadyOpened
      hasContent={false}
      closed={false}
      priors={withPrior ? { 1: SAMPLE_BACK1, 2: SAMPLE_BACK2 } : {}}
      initialMode="edit"
      photos={[]}
      preview
    />,
  );
}

/** 그 회차 문안이 되비추는 모든 키(1면 슬롯 · 심화 · 지난 걸음). */
function mirrorKeys(sessionNo: number): { key: string; back: number }[] {
  const c = getCheckinSession(sessionNo)!;
  const out: { key: string; back: number }[] = [];
  const take = (m?: { keys: string[]; back?: number }) => {
    if (m) for (const k of m.keys) out.push({ key: k, back: m.back ?? 1 });
  };
  for (const s of orderedSlots(c)) take(s.block.mirror);
  for (const f of c.deepen.fields) take(f.mirror);
  take(c.step.lastStep?.mirror);
  return out;
}

describe('미리보기 표본이 전 회차의 되비추기를 덮는다', () => {
  // 표본에 키가 빠지면 앵커일 때는 상자가 통째로 사라지고, 뒤따르는 키일 때는 값이 조용히 짧아진다.
  //   회차가 늘면 이 검사가 자동으로 따라온다 — 손목록이 아니라 레지스트리에서 파생한다.
  it('등록된 전 회차의 mirror 키가 표본 봉투에 들어 있다', () => {
    const envelopes: Record<number, Record<string, unknown>> = { 1: SAMPLE_BACK1, 2: SAMPLE_BACK2 };
    for (const n of REGISTERED) {
      for (const { key, back } of mirrorKeys(n)) {
        expect(envelopes[back], `${n}회차 back:${back} 봉투가 없다`).toBeTruthy();
        expect(envelopes[back][key], `${n}회차 되비추기 키 ${key}(back:${back})가 표본에 없다`).toBeTruthy();
      }
    }
  });
});

describe('5회차 — 되비추기 두 곳이 화면에 그려진다 (ADR-108 · §10)', () => {
  it('withPrior 를 켜면 두 캡션과 4회차 값이 함께 뜬다', () => {
    const html = card(5, true);
    expect(html).toContain('지난 시간에 적으신 「못 하게 될 것 같은 때」');
    expect(html).toContain(SAMPLE_BACK1.step_blocker as string);
    expect(html).toContain('지난 시간의 한 걸음과 첫 도미노');
    expect(html).toContain(SAMPLE_BACK1.domino_what as string); // 표본에 없던 그 값
  });

  it('withPrior 를 끄면 되비추기가 사라지고 lastStep 만 empty 문구', () => {
    const html = card(5, false);
    expect(html).not.toContain('지난 시간에 적으신 「못 하게 될 것 같은 때」');
    expect(html).toContain('이번 회차부터 한 걸음이 쌓입니다.');
  });
});

describe('심화 placeholder 가 화면에 닿는다 (ADR-109)', () => {
  it('5회차 심화 ② 두 칸에 지시서가 지정한 예시가 뜬다', () => {
    const html = card(5, true);
    expect(html).toContain('월요일 아침 사무실에 앉으면');
    expect(html).toContain('그 자료를 30분 먼저 연다');
  });

  // 회차 번호로 분기하지 않는다 — 선언이 없는 회차는 출력이 바이트 동일하다.
  it('1~4회차 심화에는 선언이 없어 출력이 달라지지 않는다', () => {
    for (const n of [1, 2, 3, 4]) {
      const fields = getCheckinSession(n)!.deepen.fields;
      for (const f of fields) expect('placeholder' in f, `${n}회차`).toBe(false);
    }
  });

  // 반대 방향 가드 — 화면이 문구를 지어내지 않는다.
  it('화면에 뜬 심화 placeholder 는 그 회차 문안이 선언한 문자열이다', () => {
    for (const n of REGISTERED) {
      const html = card(n, true);
      for (const f of getCheckinSession(n)!.deepen.fields) {
        if (f.placeholder) expect(html, `${n}회차 ${f.key}`).toContain(f.placeholder);
      }
    }
  });
});
