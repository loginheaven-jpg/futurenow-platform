// MenuSheet 키 판정 전수 (4차 F-1 · 게이트 항목 — 지휘부 강조 ②).
//
// *"접근성이 아니라 품질 원칙이다"* — 시트가 열렸는데 탭이 뒤 화면으로 새면
//   사용자는 자기가 어디 있는지 잃는다. 그 판정을 여기서 빠짐없이 잰다.
import { describe, expect, it } from 'vitest';
import { sheetKeyAction, shouldCloseOnOverlay } from './sheetKeys';

const base = { key: 'Tab', shiftKey: false, atFirst: false, atLast: false, inside: true, hasFocusable: true };

describe('MenuSheet — 키 판정', () => {
  it('**ESC 는 언제나 닫는다** — 초점이 어디에 있든', () => {
    for (const inside of [true, false]) {
      for (const hasFocusable of [true, false]) {
        expect(sheetKeyAction({ ...base, key: 'Escape', inside, hasFocusable })).toBe('close');
      }
    }
  });

  it('**마지막에서 탭하면 첫으로 감아 돈다** — 뒤 화면으로 새지 않는다', () => {
    expect(sheetKeyAction({ ...base, atLast: true })).toBe('focus-first');
  });

  it('**첫에서 shift+탭하면 마지막으로 감아 돈다**', () => {
    expect(sheetKeyAction({ ...base, shiftKey: true, atFirst: true })).toBe('focus-last');
  });

  it('가운데서는 브라우저 기본 순서를 그대로 둔다 — 직접 옮기면 읽기 순서와 어긋난다', () => {
    expect(sheetKeyAction(base)).toBe('pass');
    expect(sheetKeyAction({ ...base, shiftKey: true })).toBe('pass');
  });

  it('**초점이 밖으로 샜으면 방향에 맞는 끝으로 끌어온다**', () => {
    expect(sheetKeyAction({ ...base, inside: false })).toBe('focus-first');
    expect(sheetKeyAction({ ...base, inside: false, shiftKey: true })).toBe('focus-last');
  });

  it('초점 받을 것이 없으면 가두지 않는다 — 가둘 대상이 없다', () => {
    expect(sheetKeyAction({ ...base, atLast: true, hasFocusable: false })).toBe('pass');
    // 그래도 ESC 는 닫힌다(위 첫 단언).
  });

  it('탭·ESC 외의 키는 건드리지 않는다', () => {
    for (const key of ['Enter', ' ', 'ArrowDown', 'a', 'Home']) {
      expect(sheetKeyAction({ ...base, key }), key).toBe('pass');
    }
  });

  it('**바깥 탭은 오버레이에서 시작한 눌림만 닫는다**', () => {
    expect(shouldCloseOnOverlay({ targetIsOverlay: true })).toBe(true);
    // 시트 안에서 눌러 밖에서 뗀 드래그로 닫히면 사용자는 자기가 뭘 했는지 모른다.
    expect(shouldCloseOnOverlay({ targetIsOverlay: false })).toBe(false);
  });
});
