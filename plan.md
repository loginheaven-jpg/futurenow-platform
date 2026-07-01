# 퓨처나우 진단 플랫폼 — plan.md

> 본 문서는 **지금 짓지 않는 것**을 담는다 — 보류 항목·향후 업그레이드·미해결 질문.
> 착수가 결정되면 해당 항목을 `architecture.md`로 승격하고 여기서 제거한다.
> 확정 사양은 모두 `architecture.md`에 있다.

---

## 1. 보류 (Deferred — 순서·시점이 정해진 것)

| 항목 | 내용 | 착수 조건 |
|---|---|---|
| **코어 패키지 추출 (C안)** | `/src/core`를 독립 패키지(또는 모노레포 워크스페이스)로 분리 | 퓨처나우로 플러그인 계약이 안정화된 뒤 |
| **SAIL 추상 이관** | 현 SAIL을 추출된 코어 위 인스트루먼트 모듈로 재구성. 별도 작업공간(클코3) | 코어 패키지 추출 완료 후. **그 전까지 SAIL은 기능적으로만 운영·개선, 추상 흉내 금지** |
| **lifegraph 이관** | Firebase/Firestore → Supabase. 라이프커브 캔버스를 CustomBlock으로 흡수 | SAIL 이관 안정화 후 (최후순위) |
| **AI 게이트웨이 위치 확정** | Claude API 호출을 Railway 별도 게이트웨이로 둘지, Supabase Edge Function으로 통합할지 | B③ 리포트 자동 문구 설계 시 결정 |

---

## 2. 향후 기능 (Future — 시점 미정)

- **STEP 2~5 진단 확장**: 퓨처나우 후속 단계 진단을 같은 계약 위 인스트루먼트로 추가.
- **돌봄 연락 중개 흐름**: 전화번호는 운영자 전용이므로, 코치가 돌봄 대상에게 연락해야 할 때 운영자가 중개하거나 코치의 '연락 요청'을 운영자가 여는 워크플로.
- **그룹 리포트 고도화**: 그룹 평균 레이더 외 분포·변화 추이·차수 간 비교.
- **알림 채널 확장**: 인앱 외 이메일·카카오 알림 등.
- **다국어·접근성 강화**: 스크린리더·키보드 내비게이션 정밀화.
- **사후 진단 리마인드**: 5주 후 종료진단 응답 유도 알림 메커니즘.
- **코치 온보딩 가이드**: 온라인 초보 코치를 위한 단계별 안내·튜토리얼.
- **KPC 인증번호 실검증(한국코치협회 조회 연동)**: v1.0 은 **형식검증만**(`^KPC[0-9]{5}$` — DB CHECK + `set_my_coach_kpc`/`create_coach_application` RPC + 폼 이중). 향후 한국코치협회 자격 조회 API 로 실제 유효성·본인 일치를 확인. 그 전까지 KPC 는 자기신고 형식값으로만 취급(운영자 육안 확인).

---

## 3. 미해결 질문 (Open Questions — 지휘부 결정 필요)

| # | 질문 | 영향 |
|---|---|---|
| ~~Q1~~ | ~~비로그인 허용?~~ → **확정: 로그인 기반(비로그인 미허용)** | architecture §5.5 로 승격(2026-06-26) |
| ~~Q2~~ | ~~참여자 계정 생성 시점~~ → **확정: 차수 가입 시 계정 생성** | architecture §5.5 |
| ~~Q3~~ | ~~사전·사후 페어링 키~~ → **확정: user_id + cohort_id + instrument_id, wave 구분** | architecture §5.5 |
| ~~Q4~~ | ~~리포트 열람 주체~~ → **확정: 참여자=순화 거울 / 코치=리얼 리포트** | 참여자 본인은 `participantMirror` 순화 뷰(`/my/cohorts/[id]/report`, severity·점수·돌봄 0), 코치는 measurement 임상 리포트(`/coach/cohort/[id]/report/[responseId]`) — 시각·경로 분리. architecture ADR-27·ADR-30 으로 승격(2026-06-29). 본인 피드백 욕구는 거울이, 임상 판단은 인도자 전용이 충족 |
| Q5 | AI 해석 문구의 검수 | Claude 생성 리포트 문구를 인도자가 검수·수정 후 확정하는 단계를 둘 것인가 (B③ 자동 해석 문구·AI 게이트웨이 결정과 묶임 — 미결 유지) |
| ~~Q6~~ | ~~코치의 멤버 이름 가시성~~ → **확정: (b) SECURITY DEFINER 멤버명부 RPC** | `cohort_member_directory`(id+name만, users RLS 미확대). architecture ADR-24·§7 로 승격(2026-06-28). (a) users RLS 확대안은 불채택 |

> Q1~Q4·Q6 **확정**. 남은 미결은 **Q5**(AI 해석 문구 검수 — B③·AI 게이트웨이 결정과 묶임).

---

## 4. 명시적 비채택 (Rejected — 기록용)

- **lifegraph Firebase 노선**: 백엔드 분산·전면 개방 보안 룰. Supabase 단일 노선으로 통일.
- **SAIL 익명 URL 공유 모델**: 퓨처나우 실명제·인도자 전용 전제와 충돌. 익명 SELECT 절 제거(ADR-06).
- **공통 채점 엔진**: 진단 간 채점 로직 공유는 질 하향평준화. 채점은 인스트루먼트 전용(ADR-01).

---

## 5. 해소·이력 (Resolved / 백로그 — 기록용)

- **coach_applications 마이그 드리프트 해소 (2026-07-01)**: 라이브 DB(거점 `zdoytzmvcafcebytttrm`)에만 있고 repo 마이그레이션엔 `CREATE`가 없던 드리프트를 backfill 마이그 `20260701061038_coach_applications_backfill.sql` 로 라이브 실측 정확 복원해 repo 편입(멱등 — 라이브 no-op·클린 재적용 시 생성). KPC·UNIQUE 는 `20260701061054` 로 별도 추가. CLAUDE §5(적용된 마이그 미수정·변경은 새 마이그로) 준수.
- **[백로그] /coach 하위 라우트 코치 정보 게이트 미적용 (심각도 낮음)**: 코치 정보 게이트(CoachInfoGate·ADR-43)는 `/coach/page.tsx` 콘솔 홈 한 곳에만 적용. 하위 라우트(`/coach/cohort/[id]`·`/coach/cohorts`·`/coach/new`)는 role 게이트 + RLS 소유(`listCohortsByCoach(me.id)`·`getCohort`→notFound)만 거쳐, 정보 미완 코치가 딥링크로 게이트를 우회할 수 있음. **누출 없음**(RLS 로 본인 소유 차수만)·심각도 낮음. 해결안 `/coach/layout.tsx` 로 하위 전체를 덮는 방식은 **별건**(S5 이후 검토).
- **KPC 실검증** → §2 향후 기능 참조(v1.0 형식검증만).
