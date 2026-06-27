# /src/instruments — 2·3층 진단별 전용 엔진+UX

각 진단은 코어의 플러그인 계약(`/contracts/instrument.ts`)을 *각자* 구현해 꽂는다.
상속(stack)이 아니라 플러그인(plug). 진단끼리 코드를 공유하지 않는다(ADR-01).

- `futurenow/` — 첫 번째 인스트루먼트. 플러그인 계약의 실전 검증자.
- `(sail/)` — 추후 이관(plan.md §1). 지금 만들지 않는다.

> 경계: 진단은 코어를 직접 참조하지 않고 `/contracts` 만 바라본다(CLAUDE §1).
