# 퓨처나우 플랫폼 — design_system.md

> 지휘부(설계자+AI)가 시안까지 확정한 디자인 시스템이다. 클로드코드는 이 문서를 따라
> 공용 UI·응답 위젯(B①)·리포트 시각화(B③)를 구현한다.
>
> 범위: **색 토큰 · 타이포 · 응답 위젯 5종 · 리포트 시각화 5종 · 종합 배치**.
> 콘솔·CohortPreview는 §9 잔여(다음 세션).
> 참조: architecture.md §10·§8.1·§8.3. ADR-11·12·20.
> 버전: **v2** (응답 위젯 + 리포트 시각화 확정 / 콘솔·CohortPreview 대기)

---

## 0. 핵심 원칙

1. **색은 3단으로만 흐른다**(ADR-11). 원천 hex → 역할(semantic) → 컴포넌트. 컴포넌트는 hex·원천 토큰을 직접 참조하지 않는다. 색 교체 시 §1.1 한 곳만 고친다.
2. **브랜드 토큰은 진단이 주입, 중립·의미 토큰은 코어 소유**(ADR-12). 퓨처나우 = 네이비+골드.
3. **색값은 잠정**이다. 첫 화면 확정 후 재평가한다(§1.1 hex 몇 줄). 토큰 구조가 옳으면 색 변경은 싸다.
4. **참여자 화면엔 경고색을 쓰지 않는다.** danger/warning/care 의미색은 **인도자 리포트·콘솔에서만**. 측정/강의 어휘 분리(§9.4)가 색 차원에서도 성립한다.
5. **명명은 리포트에서만.** 측정값('활력 8')이 강의 어휘('시들음')로 명명되는 것은 B③ 리포트 단계뿐. 문항·채점 출력엔 구인 식별자만.

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
  /* 의미색 — 인도자 화면 전용 (참여자 응답 화면 사용 금지) */
  --green-600:#2E7D6B; --amber-600:#C0852E; --red-600:#B23B3B;
  /* 의미색 — 리포트용 저채도 톤 (절제 표시) */
  --care-fill:#FAECE7;  --care-line:#D85A30;  --care-text:#993C1D;
  --thrive-soft:#9FE1CB; --mid-soft:#E9D8A6;  --languish-soft:#F0997B;
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
  /* 의미색 역할 — 인도자 화면 전용 */
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

### 1.4 규약
- 컴포넌트 CSS·className은 **2차 역할 토큰만** 쓴다. `#`hex·`--navy-*`·`--gold-*` 직접 참조 금지.
- 선택(selected) 상태 = `--color-accent`(골드). 모든 응답 위젯 공통.
- 색 교체는 §1.1 원천만 수정 → 전 시스템 반영. 컴포넌트 코드 무수정.

### 1.5 색 역할 모델 (확정 · 색 판정 1차)
> **네이비 = 앱의 틀 / 골드 = 참여자의 흔적.**

- **네이비**(`--color-primary`): 헤더·화면 제목·블록 헤딩·주요 버튼·보조 버튼 테두리. 앱이라는 고요한 그릇.
- **골드**(`--color-accent`): 선택(도트·세그먼트·체크)·진행바·슬라이더 값. 참여자가 남기는 모든 표시.
- 원천 hex 무변경. 역할 배정만. 다크에선 primary가 골드로 올라오고 primary 텍스트는 `--color-text-on-accent`로 대비 확보.

---

## 2. 타이포

- **본문 폰트**: Pretendard. CDN `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css` 또는 npm. fallback: system sans.
- **숫자**: `font-variant-numeric: tabular-nums`.

| 토큰 | size / weight / line-height | 용도 |
|---|---|---|
| display | 32 / 600 / 1.3 | 표지·결과 헤드라인 |
| h1 | 24 / 600 / 1.35 | 화면 제목 |
| h2 | 20 / 600 / 1.4 | 블록 제목 |
| body-lg | 17 / 400 / 1.7 | **참여자 응답 문항·본문** |
| body | 15 / 400 / 1.6 | 리포트·콘솔 본문 |
| caption | 13 / 400 / 1.5 | 보조·안내 |
| micro | 12 / 400 / 1.4 | 글자수·메타·축 레이블 |

- 참여자 화면 body-lg(17). 정보 화면 body(15). 참여자 문구 존대체, 리포트 본문 평어체.

---

## 3. 간격·형태 토큰

```css
:root{
  --radius:10px; --radius-lg:12px; --radius-pill:999px;
  --tap-min:44px;
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-6:24px;
  --border-hair:0.5px;
}
```
- **모든 탭 가능한 요소는 ≥44px**(`--tap-min`). 시각 크기가 작아도 히트 영역으로 보장.

---

## 4. 응답 위젯 5종 (B① 렌더 사양)

공통: 참여자 노출 문자열은 prompt·title·intro·label·양극 레이블뿐(코드·구인·polarity 비노출). 선택색 = `--color-accent`(골드). 위젯 모양으로 문항 성격 구분 — 세그먼트=방향 / 도트=강도 / 슬라이더=거리. **참여자 화면 경고색 배제.**

### 4.1 나침반 — 양극 세그먼트 바 (bipolar, 5점)
- 5칸 연결 세그먼트, **중앙 유지**. 탭 선택, 선택 칸 골드 채움. 칸 높이 ≥46px.
- **양극 레이블: 컨트롤 위, 좌/우 각 ~44% 폭 블록으로 분리.** 왼쪽 좌측정렬·오른쪽 우측정렬, 2줄 줄바꿈 허용, 중앙 여백. 한 줄에 흘려 두 문장이 붙어 보이게 하지 말 것.

### 4.2 지금의 나 — 리커트 (likert, 5점) · **2단 구조**
- **행 = 질문 한 줄(위) → 5원 전체 폭(아래).** 좌우 분할 금지.
- 척도 헤더(minLabel·centerLabel·maxLabel) **블록 상단 sticky 1회**. 각 문항엔 원만.
- 헤더·도트 모두 동일 전체 폭 **5등분 열** → minLabel↔1번 원·centerLabel('보통')↔3번 원·maxLabel↔5번 원 정렬.
- 도트 22px·탭타깃 44px·선택 골드. centerLabel 없으면 중앙 생략(ADR-20).
- 한 화면 서너 문항, 빠른 리듬.

### 4.3 간격 — 슬라이더 + 숫자 (numeric, 0~10)
- 0~10 슬라이더(step 1) + 옆 큰 숫자(accent, tabular-nums). 5영역 한 화면 세로 스택.

### 4.4 주관식 — 텍스트 영역 (text)
- 한 문장 2줄·~200자 / 여러 줄 4줄·~500자. 입력 배경 surface-sunken. placeholder 존대체. 글자수 우하단 micro.

### 4.5 체크 — 행 토글 (check)
- 텍스트(좌) + 체크박스(**우측**, 세로 중앙). 카드 전체 탭 타깃.
- **평범한 외양 — 경고색·느낌표 금지.** 선택 시 행 골드 소프트, 박스 골드. 돌봄 체크도 동일한 담담한 외양(참여자는 신호 분류를 모른다).

---

## 5. 리포트 시각화 5종 (B③ 렌더 사양) · **인도자 화면**

리포트는 인도자가 본다. 여기서 비로소 (1) 의미색이 켜지고 (2) 측정값이 강의 어휘로 명명된다. 단 **절제**가 원칙 — 낮은 값은 낙인이 아니라 돌봄 신호다. 시각물 본문은 차분한 네이비·회색, 의미색은 돌봄 신호 한 곳에만.

### 5.1 나침반 이동 — 덤벨 (4축)
- NAV1~4 각 가로 트랙(좌극↔우극). 사전 = 빈 점(회색 윤곽), 사후 = 찬 점(네이비), 연결선.
- 오른쪽 이동 = 접근·자기기준·미래·제로베이스 강화. 4축 이동 폭 비교가 헤드라인.
- 다이얼 게이지는 표지·인트로 **장식**으로만(본 비교는 덤벨).

### 5.2 간격 — 레이더 (5영역)
- 오각 레이더. **사후 = 면 채움(네이비 13% + 실선), 사전 = 점선 윤곽(회색).** 바깥일수록 5년 후에 근접.
- 정밀 수치가 필요하면 영역별 덤벨/수치표를 보조로.

### 5.3 GROW+F — 충전 막대 (5축)
- G·R·O·W·F 각 축 가로 막대. 사전(회색)·사후(네이비) 나란히. 가장 짧은 사후 막대 = 보강 포인트.
- **그룹 평균 한 시점**은 단계 사슬(G→R→O→W→F 원, 채도=충전도)로 — 1주차 오프닝용.

### 5.4 활력 지수 — 띠 이동 (5~25)
- 구간 띠: 시들음(≤10, `--languish-soft`)·중간(`--mid-soft`)·번성(`--thrive-soft`). 사전→사후 화살표 이동.
- 옆/아래에 **상태 배지 + 돌봄 안내**(예: "시들음 신호 · 개별 안부 권장"). 명명은 여기서.
- 사전 단독 시점(사후 없음)은 단일 구간 게이지로 폴백.

### 5.5 돌봄 신호 — 조건부 배너
- 활력 시들음 또는 Red Flag 또는 돌봄 체크 시에만 리포트 **최상단**에 저채도 띠(`--care-fill`/`--care-line`/`--care-text`).
- 문구는 우선순위 안내("돌봄 권장 · 개별 안부를 권합니다"). 경보·낙인 아님. 신호 없으면 배너 자체를 렌더하지 않음.

---

## 6. 종합 리포트 배치 (B③ 개인 리포트)

읽는 순서 = 코칭의 순서. 위에서 아래로 위계가 흐른다.

```
[네이비 헤더] 이름 · 사전·사후 비교 · 인도자 전용
[돌봄 신호]   조건부. 시들음·Red Flag·돌봄 체크 시에만
[헤드라인]    활력 띠 이동  |  나침반 덤벨        ← "달라졌는가"
[깊이]        간격 레이더   |  GROW+F 충전막대    ← "어디가 자랐고 약한가"
[그 사람의 말] E1~E3 주관식 · 돌봄 메모           ← 숫자가 못 담는 목소리
```
- 데스크톱 2×2, **모바일 1열 스택**. 위계 순서는 양쪽 동일.
- 의미색은 돌봄 신호 배너에만. 본문 시각물은 네이비·회색 차분 톤.
- react-pdf 개인 분석보고서도 같은 위계·시각 사양. 그룹 평균 뷰는 §5.3 단계 사슬 + 그룹 레이더 평균.

---

## 7. 공용 컴포넌트 (코어 /src/core/ui)

| 컴포넌트 | 비고 |
|---|---|
| Button | primary(네이비)·ghost(네이비 테두리). 높이 ≥44px |
| Card | surface-2 + border-hair + radius-lg |
| ProgressBar | 트랙 surface-sunken, 채움 accent(골드) |
| SegmentBar | 4.1 나침반 (양극 레이블 좌우 분리) |
| DotScale | 4.2 리커트 (2단·5등분) |
| NumberSlider | 4.3 간격 |
| TextArea | 4.4 주관식 |
| CheckRow | 4.5 체크 |
| StickyScaleHeader | 4.2 척도 고정·5등분 정렬 |
| **리포트 차트군** | Dumbbell · Radar · ChargeBars · VitalityBand · CareBanner (§5). recharts/SVG·역할 토큰 기반 |

- 컴포넌트는 인스트루먼트 중립(코어 소유). 퓨처나우 전용 색·문구 비포함.

---

## 8. 접근성

- 탭 타깃 ≥44px. 라디오/체크 `role`·`aria-checked`·키보드(Space/Enter).
- 명도 대비: 본문 ≥4.5:1, 큰 텍스트·그래픽 ≥3:1(라이트·다크 양쪽). 의미색 띠도 텍스트 라벨 병기(색 비의존).
- 색에만 의존하지 않는다 — 선택은 채움+테두리 동시, 활력 구간은 라벨 병기.
- 모바일 우선. 슬라이더·세그먼트 터치 드래그·탭 양쪽.

---

## 9. 미확정 (다음 디자인 세션)

- **코치·운영자 콘솔** UI(초보자 안내형): 차수 개설·참여 관리·돌봄 명단·그룹 리포트 진입.
- **CohortPreview** 화면(코드 입력 후 차수 미리보기) — `resolve_cohort_by_code` 메타(coach_name·member_count) 표시. 별도 타입 추가 시 계약 협의.
- 색 1차 팔레트 **첫 화면 확정 후 재평가**(네이비·골드 색조 조정 여지).
