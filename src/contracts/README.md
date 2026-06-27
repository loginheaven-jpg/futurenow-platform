# /src/contracts — A·B 계약 (시스템의 척추)

코어와 진단이 **공유**하는 타입. 코어·진단은 서로를 직접 참조하지 않고 양쪽 다
여기만 바라본다(architecture §4 / CLAUDE §1).

| 파일 | 방향 | 내용 |
|---|---|---|
| `domain.ts` | 공용 | Role·Wave·CoreUser·Cohort·Enrollment·ResponseEnvelope·AlertInput … (architecture §7) |
| `core-context.ts` | A: 코어 → 진단 | `CoreContext` — 코어가 제공하는 서비스 표면 (architecture §7) |
| `instrument.ts` | B: 진단 → 코어 | `InstrumentModule` + 4종 플러그인 인터페이스(B①~④) (architecture §8) |

> **변경은 지휘부 승인 후에만.** 이 타입을 바꾸는 것은 척추를 바꾸는 일이다
> (architecture §0 / CLAUDE §1). 타입은 architecture §7·§8 정의를 **그대로** 옮긴다.
