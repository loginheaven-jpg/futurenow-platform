// 서버 액션 실패 문안 — **한 문으로 지난다** (U-6).
//
// ─────────────────────────────────────────────────────────────────────────────
// **왜 필요했나.** 같은 본부 화면의 액션이 두 정책으로 갈려 있었다(U-6 실측):
//   · `admin/actions.ts` 여섯 액션 — `e.message` 를 **그대로** 화면에 올린다.
//     그런데 그 파일 어디에도 «왜 그렇게 하는가» 가 적혀 있지 않다. **판단된 적 없는 관행**이다.
//   · `admin/approvals/actions.ts` — *「실패 사유를 화면에 그대로 옮기지 않는다 — 내부 메시지가
//     운영자 화면을 통해 새지 않게.」* 라 적고 **고정 문장으로 덮는다.** 이쪽만 결정이 있었다.
//
// **결정이 있는 쪽으로 관행을 끌어온다.** 다만 그 결정의 표적은 «**내부** 메시지» 다 —
//   사람이 지어 쓴 문장(권한 안내·부재 안내)까지 덮으면 운영자가 왜 막혔는지 알 수 없다.
//   그래서 **누가 쓴 문장인가**로 가른다:
//     · `CoreForbiddenError`·`CoreNotFoundError`·`CoreValidationError` — 코어가 **사람 말로 지은** 문장.
//       그대로 보인다(운영자가 그것을 읽고 판단한다).
//     · 그 밖의 모든 것(Postgres 오류·네트워크·미분류 `CoreError`) — **덮는다.**
//       스키마 이름·제약 이름이 화면을 통해 새지 않는다.
//
// **이것은 `refineActionError`(회기 관리)의 같은 관용구다** — 그쪽은 문자열로 가르고
//   여기는 **타입으로** 가른다. 문자열로 가르면 문안이 바뀌는 날 조용히 새기 시작한다.
// ─────────────────────────────────────────────────────────────────────────────
import { CoreForbiddenError, CoreNotFoundError, CoreValidationError } from '@/core/errors';

/** 사람이 지어 쓴 문장만 통과시킨다. 나머지는 `fallback` 으로 덮는다. */
export function safeActionError(e: unknown, fallback: string): string {
  if (e instanceof CoreForbiddenError || e instanceof CoreNotFoundError || e instanceof CoreValidationError) {
    return e.message;
  }
  return fallback;
}
