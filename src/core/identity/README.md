# core/identity

users·role·신원 필수성 정책(IdentityPolicy) 강제. 전화번호 민감 채널 게이트
(`getPhone`/`setPhone`)의 코어측 구현. `CoreUser` 에는 전화번호를 싣지 않는다
(architecture §5.2·§5.3 / ADR-03·ADR-04 / CLAUDE §10).
