import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  holdConfirm, holdCanProceed, LOSES_ADMIN, LOSES_MEMBER, NOTE_REQUIRED, UNDO_ADMIN, UNDO_MEMBER,
} from './holdConfirm';

describe('이용 보류 확인 — 넷을 다 보여 준다', () => {
  it('**대상이 누구인지가 빠지지 않는다** — 잘못 고른 것이 여기서 드러난다', () => {
    const c = holdConfirm({ name: '홍길동', email: 'a@b.test', targetIsAdmin: false });
    expect(c.who.name).toBe('홍길동');
    expect(c.who.email).toBe('a@b.test');
  });

  it('**비어 있어도 자리를 비우지 않는다** — 줄이 사라지면 누구인지 확인할 수 없다', () => {
    const c = holdConfirm({ name: null, email: null, targetIsAdmin: false });
    expect(c.who.name).toBe('(이름 없음)');
    expect(c.who.email).toBe('(계정 정보 없음)');
  });

  it('**대상이 운영자면 잃는 것이 다르다** — 두 문장이 실제로 다르다', () => {
    expect(holdConfirm({ name: 'a', email: 'e', targetIsAdmin: true }).loses).toBe(LOSES_ADMIN);
    expect(holdConfirm({ name: 'a', email: 'e', targetIsAdmin: false }).loses).toBe(LOSES_MEMBER);
    expect(LOSES_ADMIN).not.toBe(LOSES_MEMBER);
    // 둘 다 **로그인이 막힌다**는 사실을 말해야 한다 — 그것이 이 모델의 핵심이다.
    for (const s of [LOSES_ADMIN, LOSES_MEMBER]) expect(s).toContain('로그인하실 수 없게');
    // 운영자 문장만 되돌리는 주체를 좁힌다.
    expect(LOSES_ADMIN).toContain('슈퍼어드민');
    expect(LOSES_MEMBER).not.toContain('슈퍼어드민');
  });

  it('**되돌리는 법이 대상에 따라 다르다**', () => {
    expect(holdConfirm({ name: 'a', email: 'e', targetIsAdmin: true }).undo).toBe(UNDO_ADMIN);
    expect(holdConfirm({ name: 'a', email: 'e', targetIsAdmin: false }).undo).toBe(UNDO_MEMBER);
  });

  it('**근거 메모 안내가 늘 붙는다** — 일반 회원에게도 같은 확인이다', () => {
    for (const targetIsAdmin of [true, false]) {
      expect(holdConfirm({ name: 'a', email: 'e', targetIsAdmin }).noteRequired).toBe(NOTE_REQUIRED);
    }
  });
});

describe('근거 메모가 비면 진행되지 않는다', () => {
  it('빈 값·공백만은 막힌다 — **공백을 통과시키면 규칙이 형식만 남는다**', () => {
    for (const v of [null, undefined, '', '   ', '\t\n']) expect(holdCanProceed(v)).toBe(false);
  });
  it('한 글자라도 있으면 진행된다', () => {
    expect(holdCanProceed('중복 가입')).toBe(true);
  });
});

describe('문안이 아직 얼지 않았다는 표시', () => {
  // **문안은 얼어야 하는 값인데 아직 초안이다.** 확정되면 이 단언과 파일 주석을 함께 걷는다.
  //   표시가 없으면 다음 사람이 초안을 확정본으로 읽는다.
  it('파일이 **지휘부 초안 · 최박사 확정 전** 임을 스스로 적고 있다', () => {
    const src = readFileSync('src/app/admin/approvals/holdConfirm.ts', 'utf8');
    expect(src).toContain('지휘부 초안이고 최박사 확정 전이다');
  });
});
