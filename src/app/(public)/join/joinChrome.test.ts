// U-4 §1·§5·§6 잠금 — **통로가 든 값과, 걷은 자리가 걷힌 채로 있는가.**
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { joinChrome, type JoinStep } from './joinChrome';
import { SCREEN_CHROME } from '@/app/_lib/screenChrome';
import { TOOL } from '@/app/_vocab/tool';

const O = { isGeneral: false, cohortName: '2026 봄 미래의 나 1기', hasMeta: true };

describe('joinChrome — 값은 전부 걷어 온 것이다(§0 문안 출처)', () => {
  it('다섯 단계의 제목·부제가 옛 `AppHeader` 줄과 같다', () => {
    expect(joinChrome('code', O)).toEqual({ variant: 'sub', title: '참여 코드' });
    expect(joinChrome('preview', O)).toEqual({ variant: 'sub', title: '이 모임에 들어갑니다' });
    expect(joinChrome('preview', { ...O, isGeneral: true })).toEqual({ variant: 'sub', title: TOOL.trial });
    expect(joinChrome('start', O)).toEqual({ variant: 'sub', title: '잠깐, 호흡 한 번', subtitle: O.cohortName });
    expect(joinChrome('profile', O)).toEqual({ variant: 'sub', title: '잠깐, 몇 가지만', subtitle: '응답을 더 깊이 읽기 위한 준비예요' });
  });

  it('**`null` 도 실측이다** — 오늘 헤더가 없던 세 단계에 제목을 지어 넣지 않았다', () => {
    for (const s of ['resolving', 'runner', 'done'] as JoinStep[]) expect(joinChrome(s, O)).toBeNull();
  });

  it('뒤로는 `AuthGate` 가 들던 그 분기다 — 미리보기를 지났으면 그리로, 아니면 코드로', () => {
    // 옛 줄: onBack={() => setStep(meta ? 'preview' : 'code')}
    expect(joinChrome('auth', O)).toEqual({ variant: 'sub', title: '들어가기', back: 'preview' });
    expect(joinChrome('auth', { ...O, hasMeta: false })).toEqual({ variant: 'sub', title: '들어가기', back: 'code' });
  });

  // **`CodeInput` 에서 옮겨온 단언**(U-4 · 지우지 않는다) — *전진밖에 없는 화면에 출구가 있는가.*
  //   옛 부품은 `variant="sub"` 라 `AppHeader` 가 홈 아이콘을 그렸다. 통로가 그 값을 그대로 나른다.
  //   **한 번 잃을 뻔했다** — 뒤로 유무로 `sub`/`flow` 를 파생시켰더니 넷이 `flow` 가 되어
  //   홈이 사라졌다. `flow` 는 «일부러 출구 없음»이라 파생으로 정할 값이 아니다.
  it('★ 출구 — 다섯 단계가 모두 `sub` 다(홈 아이콘이 서는 조건)', () => {
    for (const s of ['code', 'preview', 'auth', 'start', 'profile'] as JoinStep[]) {
      expect(joinChrome(s, O)?.variant, `${s} 단계에서 출구가 사라졌다`).toBe('sub');
    }
  });

  it('부품은 헤더를 그리지 않는다 — 예외 다섯이 걷힌 근거다(§6)', () => {
    for (const f of ['AuthGate', 'CodeInput', 'CohortPreview', 'ProfileForm', 'StartGuide']) {
      expect(readFileSync(`src/app/_screens/entry/${f}.tsx`, 'utf8'), `${f} 가 헤더를 되찾았다`)
        .not.toMatch(/<AppHeader/);
    }
  });
});

describe('U-4 §5 — 「처음으로」는 여섯에서 걷혔고 `/signup` 에만 남는다', () => {
  // **잣대는 「사라진 항목 0」이 아니라 「목적지에 여전히 닿는가」다**(지휘부 2026-08-29).
  //   여섯은 4폭 전부에서 껍데기 로고가 실브라우저에 보였고 목적지가 같은 `/` 였다.
  //   `/signup` 은 표가 `flow`(출구 없음)라 **로고가 아예 없다** — 걷으면 유일한 출구가 사라진다.
  const walked = [
    'src/app/(public)/contact/page.tsx',
    'src/app/(public)/library/page.tsx',
    'src/app/(public)/news/page.tsx',
    'src/app/(public)/login/LoginForm.tsx',
    'src/app/(public)/reset/ResetRequestForm.tsx',
    'src/app/(public)/reset/confirm/ResetConfirmForm.tsx',
  ];

  it('여섯에는 없다', () => {
    for (const f of walked) {
      const src = readFileSync(f, 'utf8').replace(/\{\/\*[\s\S]*?\*\/\}/g, ''); // 걷었다는 주석은 세지 않는다
      expect(src, `${f} 에 「처음으로」가 되살아났다`).not.toContain('처음으로');
    }
  });

  it('`/signup` 에는 남는다 — 표가 **되돌아가는 문 하나**를 선언했기 때문이다', () => {
    // **표기를 실물에 맞췄다**(지휘부 판정 2026-08-29) — `flow` 아래 `exit` 한 칸.
    //   문자열이 아니라 **계약을 읽는다.** 표에서 `exit` 이 사라지면 여기서 먼저 운다.
    const c = SCREEN_CHROME['/signup'];
    expect(c.kind).toBe('bar');
    const exit = c.kind === 'bar' ? c.exit : undefined;
    expect(exit, '`/signup` 의 되돌아가는 문 선언이 사라졌다').toBeTruthy();
    expect(exit?.href).toBe('/');
    expect(exit?.why.length, '사유 없는 선언은 다음 사람이 못 판단한다').toBeGreaterThan(20);
    // 그리고 **화면에 실제로 그 문이 있다** — 선언만 있고 문이 없으면 갇힌다.
    const src = readFileSync('src/app/(public)/signup/SignupClient.tsx', 'utf8');
    expect(src, '선언은 남고 문이 사라졌다').toContain(exit!.label);
  });
});
