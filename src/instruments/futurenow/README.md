# instruments/futurenow — 퓨처나우 전용 엔진+UX

`InstrumentModule` 구현체(architecture §8·§9). 계획 파일(architecture §4):

| 파일 | 계약 | 상태 |
|---|---|---|
| `flow.ts` | B① 응답 스키마(31문항·7블록) | 선언형 — 비시각 부분 우선, 위젯은 디자인 후 |
| `scoring.ts` | B② 7규칙 채점(architecture §9.3) | **사양 확정 후 구현** — 단위테스트 필수(CLAUDE §9) |
| `report.tsx` | B③ 화면·PDF·그룹 리포트 | 디자인 시스템 확정 후 |
| `alerts.ts` | B④ Red Flag·돌봄 트리거 | 사양 확정 후 |
| `schema.ts` | answers·profile zod 스키마 | 경계 검증(CLAUDE §9) |
| `copy.ts` | 참여자 노출 문구(존대체)·리포트 명명 | 측정/강의 어휘 분리(CLAUDE §7) |

> 이번 단계: B②③④는 **인터페이스 스텁까지만**. 채점·리포트·알림 구현은 사양 확정 후.
> 측정 어휘('시들음'·'원씽' 등)는 리포트(B③) 단계에서만 등장(architecture §9.4).
