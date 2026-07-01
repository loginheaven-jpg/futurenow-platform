// 퓨처나우 참여 프로필 도메인 어휘(성별 제외 — 성별은 전 서비스 공통이라 @/contracts/vocab 소유).
// 종교 목록·KPC 형식·생년 UX 상한은 퓨처나우 소유(형제 진단이 강제로 공유하지 않는다 — 지휘부 확정).
// 가입/프로필 폼(AuthGate·ProfileForm)과 내 정보(AccountForm)가 같은 원천을 참조 — 중복 제거.
export const RELIGIONS = ['기독교', '천주교', '불교', '무교', '기타'];
export const KPC_RE = /^KPC\d{5}$/; // 코치 KPC 형식(v1.0 형식검증만 — 실검증은 plan.md §2). DB CHECK '^KPC[0-9]{5}$' 와 일치.
export const CURRENT_YEAR = 2026; // 생년 입력 UX 상한(현재 연도). DB CHECK 범위는 1900..2100.
