import { describe, expect, it } from 'vitest';
import { getCheckinSession } from './index';
import { anonNoticeText, buildCheckinRead, readSelfHighlights, type ReadFlags } from './readModel';
import { CHECKIN_SESSION_1 } from './session1';
import { CHECKIN_SESSION_2 } from './session2';
import { CHECKIN_SESSION_3 } from './session3';
import { CHECKIN_SESSION_4 } from './session4';
import { CHECKIN_SESSION_5 } from './session5';

// 회차 레지스트리 가드 — **한 곳에 모은다.**
//
// 왜 모았나: 이 가드가 session2·3·4.test.ts 와 readModel.test.ts 넷에 흩어져 있었고,
//   4회차 등록에서 한 번, 5회차 지시서에서 또 한 번 **연속으로 누락됐다.** 특히 readModel 쪽은
//   `buildCheckinRead(n, …)` 형태라 `getCheckinSession(n)` 문자열 검색으로는 영원히 안 잡힌다.
//   두 번 반복된 것은 사람 문제가 아니라 양식 문제라, 회차를 등록할 때 볼 자리를 하나로 줄인다.
//
// 왜 목록을 손으로 안 적나: 손으로 적은 목록이 바로 그 어긋난 것이었다. `REGISTERED` 를 **레지스트리에서
//   파생**시키면 회차를 등록해도 이 파일에서 고칠 것이 `FILES` 한 줄뿐이고, 손목록이 만들던 구멍
//   — 오타로 6을 건너뛰고 7이 등록되는 경우 — 이 연속성 단언에 걸린다.
//
// 이 파일이 흡수한 것(기존 넷에서 옮겨 온 단언):
//   · 객체 동일성(toBe)      ← session3.test.ts · session4.test.ts
//   · 경계 방어(0 · 음수)     ← session2.test.ts
//   · 읽기 경로 넷 · 모드 둘   ← readModel.test.ts
//   지우고 만들면 그 사이에 커버리지가 비므로, 이 파일이 통과한 뒤에 기존 넷을 지웠다.

// 문안 파일 명시 — 등록됐는데 여기 없거나, 여기 있는데 미등록인 경우를 아래 두 단언이 잡는다.
const FILES: Record<number, ReturnType<typeof getCheckinSession>> = {
  1: CHECKIN_SESSION_1,
  2: CHECKIN_SESSION_2,
  3: CHECKIN_SESSION_3,
  4: CHECKIN_SESSION_4,
  5: CHECKIN_SESSION_5,
};

// 레지스트리에서 파생한다. 12 는 7회차 편성의 넉넉한 상한 — 그보다 뒤가 등록되면 연속성 단언이 먼저 운다.
const PROBE = Array.from({ length: 12 }, (_, i) => i + 1);
const REGISTERED = PROBE.filter((n) => getCheckinSession(n) !== null);
const NEXT = REGISTERED.length + 1;

const OPEN: ReadFlags = { stepPrivate: false, suggestionAnon: false, contactRequest: false };
const ANY_ANSWERS = { step_what: '아침에 10분 걷기', mood: ['후련함'], self_note: '오늘은 여기까지' };

describe('회차 레지스트리 가드', () => {
  it('1부터 빈틈없이 이어진다 — 회차를 건너뛰고 등록할 수 없다', () => {
    expect(REGISTERED).toEqual(PROBE.slice(0, REGISTERED.length));
    expect(REGISTERED.length).toBeGreaterThan(0);
  });

  it('등록 회차 수와 문안 파일 수가 같다', () => {
    expect(REGISTERED.length).toBe(Object.keys(FILES).length);
  });

  // sessionNo 만 보면 레지스트리가 복사본을 돌려줘도 통과한다. toBe 만이 그것을 잡는다.
  it('레지스트리가 문안 파일 객체를 그대로 돌려준다', () => {
    for (const [n, obj] of Object.entries(FILES)) {
      expect(getCheckinSession(Number(n)), `${n}회차`).toBe(obj);
      expect(getCheckinSession(Number(n))?.sessionNo, `${n}회차 sessionNo`).toBe(Number(n));
    }
  });

  // 미등록 회차가 링크로 새어 나가지 않는다 — 이 가드의 본래 목적이다.
  it('경계 밖은 null — 0 · 음수 · 다음 회차 · 먼 회차', () => {
    expect(getCheckinSession(0)).toBeNull();
    expect(getCheckinSession(-1)).toBeNull();
    expect(getCheckinSession(NEXT)).toBeNull();
    expect(getCheckinSession(NEXT + 2)).toBeNull();
  });

  // 읽기 경로 **넷**(전수 아님 — readModel 이 회차번호를 받는 내보내기는 다섯이고 readAnonSuggestion·needLabel 이 밖이다.
  //   기존 넷도 그 둘을 지키지 않았으므로 커버리지가 준 것은 아니나, '한 곳에 모은다'는 취지에 구멍이 남는다.
  //   **6회차 착수 때 다섯으로 넓힌다.**) 둘만 지키면 나머지가 미등록 회차에서 어떻게 되는지 아무도 안 본다.
  it('읽기 경로 넷이 미등록 회차에서 파손되지 않는다 (전수 아님 — 6회차에 다섯으로)', () => {
    expect(buildCheckinRead(NEXT, ANY_ANSWERS, OPEN, 'self')).toEqual([]);
    expect(buildCheckinRead(NEXT + 2, ANY_ANSWERS, OPEN, 'facilitator')).toEqual([]);
    expect(readSelfHighlights(NEXT, ANY_ANSWERS)).toBeNull();
    expect(anonNoticeText(NEXT)).toBe('');
  });
});
