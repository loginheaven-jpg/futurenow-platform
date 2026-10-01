# 퓨처나우 진단 플랫폼 (`site-v2`)

운영 중인 서비스다 — **https://future.yebom.org** (Next.js 16 · React 19 · Supabase · Vercel `icn1`).
`main` 에 push 하면 Vercel 이 배포한다. 실참여자가 쓰는 시스템이므로 **작업 규율이 코드보다 먼저다.**

이 파일은 **입구**다. 규칙 본문은 각 정본에 있고 여기서는 가리키기만 한다 — 같은 규칙을 두 곳에 두면
한쪽만 고쳐지는 날이 온다(불변식 23).

---

## 1. 먼저 읽을 것 — 순서가 있다

| 순서 | 파일 | 무엇 |
|---|---|---|
| 1 | [`CLAUDE.md`](CLAUDE.md) | **작업 규율**. §12 불변식 24 가 가장 위다 — 발주서와 어긋나면 불변식이 이긴다 |
| 2 | [`architecture.md`](architecture.md) | **확정 사양의 단일 진실**. §11 ADR 표가 「지금까지 무엇을 왜 정했는가」의 전부다 |
| 3 | [`plan.md`](plan.md) | 지금 짓지 않는 것 — 보류·향후·미해결 질문 |
| 4 | [`design_system.md`](design_system.md) | UI 토큰·부품 표. **확정 전 UI 를 임의로 디자인하지 않는다**(불변식 20) |
| 5 | [`futurenow_copy_principles.md`](futurenow_copy_principles.md) | 문안 최상위 규범. 회차별 지시서와 충돌하면 이 문서가 이긴다 |
| — | [`docs/reports/`](docs/reports/) | 작업 보고 **전문**. 채팅은 요약이고 이 폴더가 기록이다([규약](docs/reports/README.md)) |
| — | `docs/tasks/` | 지휘부 지시서 |

**개발 이력을 따라가는 법**(값을 옮겨 적지 않는다 — 적는 순간 낡는다):

```bash
grep -n "^| ADR-" architecture.md | tail -20   # 최근 결정 20개 — 마지막 행이 최신
ls -t docs/reports | head -20                  # 최근 보고서
git log --oneline -30                          # 최근 커밋
```

---

## 2. 새 PC에서 시작하기

```bash
git clone https://github.com/loginheaven-jpg/futurenow-platform.git
cd futurenow-platform
npm ci                                   # Node 22 · npm 11 에서 확인(2026-10-01)
cp .env.example .env.local               # 값은 지휘부에게 받는다. 커밋 금지
npx playwright install chromium          # 실브라우저 검증 도구를 쓸 때만 필요
npm run dev                              # http://localhost:3000
```

`.env.local` 에 **무엇이 왜 필요한지는 [`.env.example`](.env.example) 에 키마다 적혀 있다.**
앱 구동에 필요한 것은 둘뿐이고, 나머지는 검증 도구용이다 — 없으면 그 도구만 못 돈다.

**새 클론이 실제로 서는지 잰 적이 있다**(2026-10-01): clone → `npm ci` → `npm run build` → 전체 테스트까지
새 폴더에서 통과했다. 다음 사람도 같은 네 줄로 확인하면 된다.

---

## 3. 명령 — 무엇을 할 때 무엇을 치는가

| 할 일 | 명령 | 비고 |
|---|---|---|
| **완주 검증** | `node scripts/verify.mjs` | tsc·eslint·vitest·build 넷을 한 번에. **보고에는 이 출력 전문을 붙인다**(CLAUDE §11) |
| 타입·린트·테스트 따로 | `npm run typecheck` · `npm run lint` · `npm test` | |
| 실DB 통합 테스트 | `RUN_RLS_INTEGRATION=1 SUPABASE_DB_URL=… npx vitest run tests/<파일>` | 기본은 스킵. 전부 `BEGIN … ROLLBACK` 이라 실데이터가 변하지 않는다 |
| 배포 확인 + 실브라우저 검사 | `node scripts/postdeploy.mjs` | 기대 커밋을 `git ls-remote origin main` 에서 뽑는다 — 손으로 박지 않는다 |
| 워크북 사진 실화면 | `node scripts/postdeployWorkbook.mjs [--clean]` | QA 회기·가짜 이미지. 중단돼도 뒤처리한다 |
| 화면 캡처 | `node scripts/screens.mjs` · `node scripts/shots.mjs` | 역할별 로그인 뒤 실라우트 |
| 문안 기준선 | `node scripts/regenCopyBaseline.mjs --verify` / `--write` | 회차 문안을 고치면 **손으로 만들지 않고 재생성한다** |
| 껍데기 감사 | `node scripts/shellAudit.mjs --routes` | 헤더·껍데기가 빠진 라우트를 센다 |
| QA 기수 도구 | `node scripts/qaCohort.mjs` | 세우고·재고·치운다. 실기수 코드는 거부한다 |

---

## 4. 바꿀 때의 순서 (요지 — 본문은 `CLAUDE.md`)

- **브랜치에서 작업하고 `main` 에 병합한다.** 커밋 전 `git branch --show-current` 로 확인한다.
- **문서 정합이 완료 판정이다**(불변식 24) — 커밋 전에 `architecture.md` 를 갱신한다. 새 결정은 ADR 번호를 잇는다.
- **push 증거는 원격 조회다** — 보고 마지막 줄에 `git ls-remote origin <브랜치>` 출력을 붙인다.
- **마이그레이션**: `supabase/migrations/` 에 타임스탬프 파일로 **더하기만** 한다(적용된 파일 수정 금지).
  **되돌리는 문을 먼저 쓰고**(`…_rollback.sql`), 트랜잭션 안에서 본문→롤백을 예행해 원형 복귀를 확인한 뒤 적용한다.
  **넓히는 변경은 스키마가 먼저, 좁히는 변경은 코드가 먼저다.**
- **잠금은 물려 봐야 잠금이다** — 테스트를 만들면 막아야 할 것을 일부러 심어 실제로 우는지 본다.

---

## 5. 절대 하지 않는 것

- `.env*` · service_role 키 · QA 계정 **자격 증명을 커밋·보고서·로그에 싣지 않는다.**
- **참여자 원문(실명·연락처와 결합된 발언)을 커밋하지 않는다.** `.gitignore` 의 `/docs/*` + negation 구조를 단순화하지 않는다(불변식 18).
- **실기수 데이터는 읽기만 한다.** 검증은 QA 기수·QA 계정으로 한다.
- **`step_private`·`suggestion_anon`·「인도자 열람」 해제는 권한 등급으로 뚫지 않는다** — 운영자도 인도자와 같은 자리에 선다(불변식 16).
- **SAIL 코드를 건드리지 않는다**(클코3 소관 · 같은 Supabase 프로젝트를 공유한다).

---

## 6. 지금 열려 있는 것

판단 대기와 후속은 **한 곳에 모으지 않고 각자 자리에 둔다** — 목록을 따로 두면 그 목록이 먼저 낡는다.

- **최근 라운드가 남긴 후속·판단 대기**: [`plan.md`](plan.md) **§2-A** — 항목마다 근거 보고서를 달아 두었다
- 보류·향후·미해결 질문: [`plan.md`](plan.md) §1·§2·§3
- 각 항목의 전문: `docs/reports/` 의 해당 보고서 「막힌 지점 · 판단 필요」 절
