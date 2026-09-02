// 제출이 조용히 사라지지 않는다 (ADR-179 후속).
//
// **무엇이 문제였나**: `submit()` 에 `catch` 가 없었다. async 이벤트 핸들러의 예외는
//   에러 경계로 가지 않고 **처리되지 않은 거절**이 된다 — 단추 잠금만 풀리고
//   **아무 문구도 없이 응답이 저장되지 않는다.** 참여자가 다 풀고 나서 겪는 일이라 피해가 크다.
//   `currentUser` 가 조회 실패에 던지기 시작하면서(ADR-179) 그 창이 넓어졌으므로 함께 막았다.
//
// ★ **여기서 행동을 잴 수 없다.** 이 저장소의 vitest 환경은 `node` 이고
//   `@testing-library/react` 가 없어 **클릭을 흉내 낼 수 없다**(⑨-c 창의 층이 대상의 층과 다르다).
//   그래서 **구조로** 잰다 — 창이 없다는 사실을 적어 두는 것까지가 이 파일의 일이다.
//   환경이 바뀌어 상호작용 렌더가 가능해지면 **행동 잠금으로 바꾼다.**
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = 'src/core/response/ResponseRunner.tsx';
const src = readFileSync(SRC, 'utf8');

/** `async function submit()` 의 몸통만 잘라 낸다 — 파일 전체를 보면 창이 너무 넓다(⑨-b). */
function submitBody(): string {
  const at = src.indexOf('async function submit()');
  expect(at, 'submit 이 없다 — 창이 비었다').toBeGreaterThan(-1);
  const lines = src.slice(at).split(String.fromCharCode(10));
  // 중첩 블록에도 괄호만 있는 줄이 있다 — **함수 자신의 들여쓰기**로 닫는다.
  const end = lines.findIndex((l, i) => i > 0 && l.replace(String.fromCharCode(13), '') === '  }');
  expect(end, 'submit 이 안 닫힌다').toBeGreaterThan(0);
  return lines.slice(0, end + 1).join(' ');
}

describe('★★ 제출 실패를 삼키지 않는다', () => {
  it('★ `submit` 에 **catch 가 있다** — 없던 것이 이 사고의 뿌리였다', () => {
    const body = submitBody();
    expect(body, 'catch 가 없다 — 실패가 처리되지 않은 거절이 된다').toContain('catch (e)');
    expect(body, '잡고 아무것도 안 한다 — 삼키는 것과 같다').toContain('setFailed(');
  });

  it('★★ 잡은 것을 **렌더에서 다시 던진다** — 이벤트 핸들러에서 던지면 아무도 안 받는다', () => {
    // 에러 경계는 렌더 중의 예외만 받는다. 잡아 두고 렌더에서 던지는 것이 그 다리다.
    const at = src.indexOf('if (failed) throw failed;');
    expect(at, '렌더에서 다시 던지지 않는다 — 잡기만 하고 아무 일도 안 일어난다').toBeGreaterThan(-1);
    // 그 줄이 **반환보다 앞**이어야 한다. 뒤에 있으면 화면이 먼저 그려지고 안 던져진다.
    expect(at, '다시 던지는 줄이 첫 반환보다 뒤에 있다').toBeLessThan(src.indexOf('  if (doneId) {'));
  });

  it('★ 받을 경계가 **실재한다** — 없으면 이 처방은 헛돈다(계열 ⑦)', () => {
    const boundary = readFileSync('src/app/error.tsx', 'utf8');
    expect(boundary, '경계가 세그먼트 경계가 아니다').toContain("'use client'");
    expect(boundary, '경계에 복구 수단이 없다').toContain('reset');
    // 원문을 화면에 싣지 않는다 — DB 오류 문구가 참여자에게 보이면 안 된다.
    expect(boundary, '경계가 오류 원문을 그린다').not.toContain('{error.message}');
  });

  it('★ 답은 잃지 않는다 — 로컬 작성본이 계속 쓰인다', () => {
    // 에러 경계로 넘어가도 다시 들어오면 복원된다. 그 근거가 사라지면 이 처방의 대가가 커진다.
    // ★ 「파일에 있는가」로 물었더니 **다른 자리(수동 중간저장)에 같은 이름이 있어** 안 물었다(⑬).
    //   자동 저장은 **디바운스 타이머 안**에 있다 — 그 자리를 본다.
    const at = src.indexOf('saveTimer.current = setTimeout(');
    expect(at, '자동 저장 타이머가 사라졌다').toBeGreaterThan(-1);
    expect(src.slice(at, src.indexOf(';', at)), '타이머가 답을 저장하지 않는다').toContain('writeLocalDraft(');
    expect(src, '복원 경로가 사라졌다').toContain('readLocalDraft(');
  });

  it('★ 이 환경에는 **행동 창이 없다** — 그 사실을 잠근다', () => {
    // 상호작용 렌더가 가능해지면 이 잠금이 울고, 그때 위 구조 잠금을 행동 잠금으로 바꾼다.
    const cfg = readFileSync('vitest.config.mts', 'utf8');
    expect(cfg, '환경이 바뀌었다 — 이제 행동으로 잴 수 있다면 그렇게 바꿔라').toContain("environment: 'node'");
    const pkg = readFileSync('package.json', 'utf8');
    expect(pkg, '@testing-library/react 가 들어왔다 — 행동 잠금으로 바꿔라').not.toContain('@testing-library/react');
  });
});
