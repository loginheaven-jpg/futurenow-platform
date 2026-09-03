'use client';
// 크롬 통로 — **화면이 껍데기에 값을 넘기는 길** (U-4 §1).
//
// ─────────────────────────────────────────────────────────────────────────────
// **왜 통로인가 — 두 쓰임을 같이 놓고 설계했다**(발주 §1).
//
//   ① `/join` 단계 크롬 — 라우트 하나에 단계 여덟이라 **라우트 키 표가 못 든다.**
//   ② 인도자 부제 — 회기 이름은 **서버 데이터**라 라우트에서 나오지 않는다.
//
//   **본문으로 내리는 안을 버린 이유**: `/join` 의 뒤로는 라우트 뒤로가 아니라
//   **위저드 단계 뒤로**(`setStep`)다. 본문으로 내려도 그 제어의 관용구가 필요하고,
//   저장소에 그것이 없어 만들면 **불변식 20**에 걸린다.
//
//   **통로는 불변식 20에 걸리지 않는다** — 새 시각 요소가 아니라 **값 전달 경로**이기 때문이다
//   (발주가 그 갈래를 명시했다). 그리고 껍데기의 `AppHeader` 가 이미 `title`·`backHref`·`onBack`·
//   `subtitle` 을 받으므로 **새 부품 0**이다.
//
//   ⚠ **`subtitle` 을 인도자 화면이 쓰지 않는다.** 인도자 부제는 최박사가 **본문 첫 줄**로
//     직접 고르셨고(§2), 통로가 생겼다고 코드가 헤더로 되돌리면 **확정을 코드가 뒤집는 것**이다.
//     `tests/chromeContext.test.tsx` 가 `src/app/coach`·`src/app/admin` 에서 그것을 잠근다.
//
//     ★ **전에 여기 적혀 있던 두 문장은 거짓이었다**(U-5 실측으로 잡았다):
//       ⑴ *「아무도 쓰지 않는다」* — `/join` 이 **쓰고 있다**(`JoinClient.tsx` 가 단계 부제를
//          이 칸으로 넘기고 `PublicShell` 이 그린다). 최박사 결재의 대상은 **회기 이름·비교
//          문구**였지 `/join` 단계 문안이 아니었으므로, 틀린 것은 결재가 아니라 **이 주석**이다.
//       ⑵ *「`tests/chromeContext.test.tsx` 가 잠근다」* — **그 파일이 없었다**
//          (`git log --all` 이 빈 출력). 잠금이 없는데 잠금이 있다고 적혀 있었다.
//       U-5 가 ⑵ 를 실제로 짓고 ⑴ 을 사실대로 고쳤다. **없는 제약에 설계를 맞출 뻔했다.**
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useEffect, useState } from 'react';

export interface ChromeOverride {
  /**
   * **`sub` 인가 `flow` 인가는 실측값이지 파생값이 아니다**(U-4 §4 · 걷다가 잡았다).
   *   처음에 *뒤로가 있으면 `sub`* 로 파생시켰더니 `/join` 다섯 단계 중 넷이 `flow` 로 내려앉아
   *   **홈 아이콘이 사라졌다**(옛 부품은 다섯 다 `variant="sub"` 였다 — 실측).
   *   `flow` 는 «일부러 출구 없음»이라 **파생으로 정할 값이 아니다.** 화면이 적어 보낸다.
   */
  variant?: 'sub' | 'flow';
  title: string;
  /** 라우트 뒤로 — 경로. 단계 뒤로에는 쓰지 않는다. */
  backHref?: string;
  /** **단계 뒤로** — 콜백. `/join` 처럼 라우트가 안 바뀌는 흐름이 쓴다. */
  onBack?: () => void;
  /** ⚠ 자리만 있다 — §2 로 지금 쓰지 않는다. 위 주석 참조. */
  subtitle?: string;
}

const Ctx = createContext<{
  override: ChromeOverride | null;
  set: (v: ChromeOverride | null) => void;
} | null>(null);

/** 껍데기와 화면을 함께 감싼다 — layout 이 두른다. */
export function ChromeProvider({ children }: { children: React.ReactNode }) {
  const [override, set] = useState<ChromeOverride | null>(null);
  return <Ctx.Provider value={{ override, set }}>{children}</Ctx.Provider>;
}

/** 껍데기가 읽는다. 통로 밖(프로바이더 없음)이면 `null` — 표가 그대로 이긴다. */
export function useChrome(): ChromeOverride | null {
  return useContext(Ctx)?.override ?? null;
}

/**
 * 화면이 자기 단계의 크롬을 알린다. **언마운트하면 스스로 걷는다** —
 * 걷지 않으면 다음 화면이 옛 제목을 쓰고, 그것이 «찍히긴 했는데 다른 것» 의 화면판이다.
 */
export function useSetChrome(value: ChromeOverride | null): void {
  const ctx = useContext(Ctx);
  const set = ctx?.set;
  const key = value ? `${value.title}|${value.backHref ?? ''}|${value.subtitle ?? ''}` : '';
  useEffect(() => {
    if (!set) return;
    set(value);
    return () => set(null);
    // 값 자체가 아니라 **내용**으로 비교한다 — 콜백은 매 렌더 새로 만들어지므로
    //   그대로 의존하면 무한 갱신이 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, key]);
}
