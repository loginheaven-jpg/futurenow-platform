# core/response

응답 봉투(responses) 저장/조회 — `saveResponse`/`getResponse`/`listResponses`.
응답 러너(ResponseRunner)의 **비시각 로직**(제약무작위 배열·진행 저장/재개·필수 검증)은
여기 두되, **위젯 렌더는 디자인 시스템 확정 후로 보류**(CLAUDE §8, architecture §8.1).

봉투는 불변: `responses` 는 INSERT/SELECT 만(UPDATE/DELETE 차단 — ADR-09).
`answers`·`subjectProfile` 은 코어 불가시(진단 소유). 경계에서 zod 검증(CLAUDE §9).
