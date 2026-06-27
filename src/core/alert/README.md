# core/alert

알림 전달·돌봄 명단. `raiseAlert(input)` 구현(architecture §7). 진단이 트리거하고
코어가 전달한다. `alerts` 는 불변(ADR-09). **점수·원문은 싣지 않는다** — 측정/강의
어휘 분리(architecture §7 AlertInput 주석). 맥락은 코치 콘솔에서만.
