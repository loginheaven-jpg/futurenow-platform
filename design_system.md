# 퓨처나우 플랫폼 — design_system.md

> 지휘부(설계자+AI)가 시안까지 확정한 디자인 시스템이다. 본 문서가 도착하기 전까지 잠겨 있던
> UI 작업의 기준이다. 클로드코드는 이 문서를 따라 공용 UI와 응답 위젯(B①)을 구현한다.
>
> 범위: **색 토큰 · 타이포 · 응답 위젯 5종**(1차). 리포트(B③) 시각화는 별도 디자인 세션에서 추가.
> 참조: architecture.md §10(디자인 시스템)·§8.1(B①). ADR-11·12.
> 버전: v1 (응답 위젯 확정 / 리포트 시각화 대기)

---

## 0. 핵심 원칙

1. **색은 3단으로만 흐른다**(ADR-11). 원천 hex → 역할(semantic) → 컴포넌트. 컴포넌트는 hex·원천 토큰을 직접 참조하지 않는다. 색 교체 시 1차 한 곳만 고친다.
2. **브랜드 토큰은 진단이 주입, 중립·의미 토큰은 코어 소유**(ADR-12). 퓨처나우 = 네이비+골드.
3. **색값은 잠정이다.** 네이비·골드 팔레트는 첫 화면 확정 후 재평가한다. 지금은 구조만 못 박는다 — 토큰 구조가 옳으면 색 변경은 1차 hex 몇 줄이다.
4. **참여자 화면엔 경고색을 쓰지 않는다.** danger/warning은 인도자 리포트·콘솔에서만. 측정/강의 어휘 분리(§9.4)가 색 차원에서도 성립한다.

---

## 1. 색 토큰 — 3단 구조

### 1.1 원천 팔레트 (1차 — 색 교체 시 여기만)

```css
:root {
  /* 브랜드 — 네이비 (잠정) */
  --navy-900:#0F1B2D; --navy-700:#1B2A41; --navy-500:#34466A; --navy-300:#5B6B8C;
  /* 브랜드 — 골드 (잠정) */
  --gold-700:#B8923D; --gold-500:#C9A24B; --gold-300:#D9B96E; --gold-100:#EFE2C2;
  /* 중립 (warm gray) */
  --gray-0:#FFFFFF; --gray-50:#F7F6F4; --gray-100:#EEECE8; --gray-200:#DEDAD3;
  --gray-400:#A8A29A; --gray-600:#6B655C; --gray-800:#3A352F; --gray-900:#211E1A;
  /* 의미색 */
  --green-600:#2E7D6B; --amber-600:#C0852E; --red-600:#B23B3B;
}
```

### 1.2 역할 토큰 (2차 — 라이트). 컴포넌트는 이것만 참조

```css
:root {
  --color-primary:var(--navy-700);      --color-primary-strong:var(--navy-900);
  --color-accent:var(--gold-500);       --color-accent-soft:var(--gold-100);
  --color-bg:var(--gray-0);             --color-surface-1:var(--gray-50);
  --color-surface-2:var(--gray-0);      --color-surface-sunken:var(--gray-100);
  --color-border:var(--gray-200);       --color-border-strong:var(--gray-400);
  --color-text:var(--gray-900);         --color-text-secondary:var(--gray-600);
  --color-text-muted:var(--gray-400);   --color-text-on-accent:var(--gray-0);
  /* 의미색 — 인도자 화면 전용. 참여자 응답 화면에서 사용 금지 */
  --color-success:var(--green-600); --color-care:var(--amber-600); --color-danger:var(--red-600);
}
```

### 1.3 다크 토큰 (2차 — 다크). 역할만 재지정, 컴포넌트 무변경

```css
@media (prefers-color-scheme:dark){:root{
  --color-primary:var(--gold-500);      --color-primary-strong:var(--gold-300);
  --color-accent:var(--gold-500);       --color-accent-soft:var(--navy-700);
  --color-bg:var(--gray-900);           --color-surface-1:var(--gray-800);
  --color-surface-2:#2A2722;            --color-surface-sunken:var(--gray-900);
  --color-border:#3D3833;               --color-border-strong:var(--gray-600);
  --color-text:var(--gray-50);          --color-text-secondary:var(--gray-400);
  --color-text-muted:var(--gray-600);   --color-text-on-accent:var(--navy-900);
}}
```
다크에서 네이비는 면적색에서 빠지고 골드가 primary로 올라온다(배경 충돌 회피).

### 1.4 규약
- 컴포넌트 CSS·className은 **2차 역할 토큰만** 쓴다. `#`hex·`--navy-*`·`--gold-*` 직접 참조 금지.
- 선택(selected) 상태 = `--color-accent`(골드). 모든 위젯 공통.
- 색 교체는 §1.1 원천만 수정 → 전 시스템 반영. 컴포넌트 코드 무수정.

### 1.5 색 역할 모델 (확정 2026-06-27 · 색 판정 1차)

**"네이비 = 앱의 틀 / 골드 = 참여자의 흔적."** 원천 hex(§1.1) 무변경 — 역할 토큰의 적용 위치만 확정.

- **네이비 `--color-primary`**: 헤더 바·화면 제목·블록 헤딩·주요 버튼(다음·주요 동작). secondary(ghost) 버튼 테두리·텍스트.
- **골드 `--color-accent`**: 선택(도트·세그먼트·체크)·진행바. 선택색 유지.
- Button: primary = 배경 `--color-primary` + 텍스트 `--color-text-on-accent`(라이트=흰색 / 다크=네이비, 대비 확보). ghost = 테두리·텍스트 `--color-primary`.
- 앱 헤더 바(있으면): 배경 네이비 · 제목 흰색 · 부제 골드.
- 다크: `--color-primary` 가 골드로 올라오므로(§1.3) 버튼·헤딩이 자동으로 다크 팔레트에 맞춰진다.

---

## 2. 타이포

- **본문 폰트**: Pretendard. CDN `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css` 또는 npm 패키지. fallback: system sans.
- **숫자**: `font-variant-numeric: tabular-nums`(점수·정렬 안정).

| 토큰 | size / weight / line-height | 용도 |
|---|---|---|
| display | 32 / 600 / 1.3 | 진단 표지·결과 헤드라인 |
| h1 | 24 / 600 / 1.35 | 화면 제목 |
| h2 | 20 / 600 / 1.4 | 블록 제목 |
| body-lg | 17 / 400 / 1.7 | **참여자 응답 문항·본문**(모바일 가독·여유) |
| body | 15 / 400 / 1.6 | 리포트·콘솔 본문(정보 밀도) |
| caption | 13 / 400 / 1.5 | 보조·안내 |
| micro | 12 / 400 / 1.4 | 글자수·메타 |

- 참여자 화면은 body-lg(17) 기준. 정보 화면(콘솔·리포트)은 body(15).
- 톤: 참여자 노출 문구는 존대체(prompt·intro·label), 리포트 본문은 평어체.

---

## 3. 간격·형태 토큰

```css
:root{
  --radius:10px; --radius-lg:12px; --radius-pill:999px;
  --tap-min:44px;            /* 최소 탭 타깃 — 전 인터랙션 준수 */
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-6:24px;
  --border-hair:0.5px;
}
```
- **모든 탭 가능한 요소는 ≥44px**(`--tap-min`). 시각 크기가 작아도 히트 영역으로 보장.

---

## 4. 응답 위젯 5종 (B① 렌더 사양)

공통: 참여자 노출 문자열은 prompt·title·intro·label·양극 레이블뿐(코드·구인·polarity 비노출, §9.4). 선택색 = `--color-accent`(골드). 위젯 모양으로 문항 성격을 구분한다 — 세그먼트=방향 / 도트=강도 / 슬라이더=거리.

### 4.1 나침반 — 양극 세그먼트 바 (bipolar, 5점)
- 5칸 연결 세그먼트, **중앙 유지**. 탭으로 선택, 선택 칸이 골드로 채워짐.
- 칸 높이 ≥46px. 양극 레이블은 컨트롤 **위**, 좌(왼정렬)·우(우정렬), 2줄까지 허용.
- 저장: 좌1~우5 정수. 화면 일련번호는 코어 러너가 부여.

### 4.2 지금의 나 — 리커트 행 스택 (likert, 5점)
- 척도 레이블(minLabel·centerLabel·maxLabel)을 블록 **상단 고정(sticky)**. 문항은 행으로 스택.
- 각 행: prompt(body 14~15) + 5도트(지름 22px). **탭 타깃 44px**(도트보다 큰 히트 영역).
- 한 화면에 서너 문항 흐르게. 빠른 리듬 우선('떠오르는 대로'). 선택 도트 골드.
- centerLabel(예 '보통')이 있으면 척도 중앙에 표기, 없으면 생략.

### 4.3 간격 — 슬라이더 + 숫자 (numeric, 0~10)
- 0~10 슬라이더(step 1) + 옆에 현재 값 큰 숫자(`accent`, tabular-nums)로 확정 표시.
- 5영역(B1~B5)을 **한 화면**에 세로 스택. 영역명(label) + 보조설명.
- 슬라이더 트랙 위 위치감이 '간격=거리' 은유를 살린다. 다 채우면 레이더 예고.

### 4.4 주관식 — 텍스트 영역 (text)
- 한 문장(들어가며): 2줄·~200자. 여러 줄(E1~E3): 4줄·~500자.
- 입력 배경은 `--color-surface-sunken`(한 단 낮춤). placeholder는 존대체 안내문.
- 글자수는 우하단 micro로 조용히. 압박 아님.

### 4.5 체크 — 행 토글 (check)
- 한 줄: 텍스트(좌) + 체크박스(**우측**, 세로 중앙). 카드 전체가 탭 타깃.
- **평범한 외양 — 경고색·느낌표 금지.** 선택 시 행 전체가 골드 소프트(`--color-accent-soft`)로, 박스는 골드.
- 돌봄 체크도 동일한 담담한 외양. 참여자는 신호 분류를 알지 못한다(§9.4). 위중도 표시는 인도자 화면에서만.

---

## 5. 공용 컴포넌트 (코어 /src/core/ui)

위젯들이 조립해 쓰는 1차 부품. 전부 역할 토큰 기반.

| 컴포넌트 | 비고 |
|---|---|
| Button | primary(골드)·ghost(테두리). 높이 ≥44px. radius |
| Card | surface-2 + border-hair + radius-lg |
| ProgressBar | 트랙 surface-sunken, 채움 accent. '7/17'류 진행 |
| SegmentBar | 4.1 나침반 |
| DotScale | 4.2 리커트 |
| NumberSlider | 4.3 간격 |
| TextArea | 4.4 주관식 |
| CheckRow | 4.5 체크 |
| StickyScaleHeader | 4.2 척도 고정 헤더 |

- 컴포넌트는 인스트루먼트 중립(코어 소유). 퓨처나우 전용 색·문구를 박지 않는다.

---

## 6. 접근성

- 탭 타깃 ≥44px. 라디오/체크는 `role`·`aria-checked`·키보드(Space/Enter) 지원.
- 명도 대비: 본문 텍스트 ≥4.5:1, 큰 텍스트 ≥3:1(라이트·다크 양쪽).
- 색에만 의존하지 않는다 — 선택은 채움+테두리 동시 변화로 표시(색맹 대응).
- 모바일 우선. 슬라이더·세그먼트는 터치 드래그·탭 양쪽 동작.

---

## 7. 미확정 (다음 디자인 세션)

- **리포트(B③) 시각화**: 나침반 게이지·오각 레이더(간격)·GROW+F 막대·활력 지수 표시·사전사후 비교 뷰. 의미색(success·care·danger) 적용 규칙.
- **코치·운영자 콘솔** UI(초보자 안내형).
- **CohortPreview** 화면(코드 입력 후 차수 미리보기) — resolve_cohort_by_code 메타(coach_name·member_count) 표시.
- 색 1차 팔레트 **첫 화면 확정 후 재평가**(네이비·골드 색조 조정 여지).
