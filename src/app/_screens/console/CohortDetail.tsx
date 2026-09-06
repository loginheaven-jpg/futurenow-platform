'use client';
// §8.3 회기 상세 — 돌봄 우선 명단. 3숫자 요약 + 명단 3묶음(먼저 챙길 분/응답 완료/아직 안 함).
// 덜 쓰는 관리(마감·정원)는 헤더 메뉴. 인도자 화면이라 상태 배지에 의미색 허용(참여자 화면 아님).
import { useState, type CSSProperties, type ReactNode } from 'react';
import { Button, Disclosure, Stepper } from '@/core/ui';
import { GENERAL_CODE } from '../entry/general';
import type { CohortSummary, RosterMember } from '../types';
import { RosterRow } from './RosterRow';
import { TOOL } from '@/app/_vocab/tool';
import { POST_OPEN_HEAD, postJoinHref, postNudgeText } from '@/app/_vocab/postNudge';

const nameInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 'var(--tap-min)',
  padding: '0 var(--space-3)',
  borderRadius: 'var(--radius)',
  border: 'var(--border-hair) solid var(--color-border)',
  background: 'var(--color-surface-2)',
  color: 'var(--color-text)',
  font: 'inherit',
  fontSize: 15,
};

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        textAlign: 'center',
        padding: 'var(--space-4) var(--space-2)',
        background: 'var(--color-surface-2)',
        border: 'var(--border-hair) solid var(--color-border)',
        borderRadius: 'var(--radius)',
      }}
    >
      <div className="t-display tnum" style={{ color, fontSize: 28 }}>{n}</div>
      <div className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{label}</div>
    </div>
  );
}

function Group({ title, color, children }: { title: string; color?: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 'var(--space-6)' }}>
      <h2 className="t-h2" style={{ color: color ?? 'var(--color-primary)', fontSize: 16, margin: '0 0 var(--space-2)' }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>{children}</div>
    </section>
  );
}

export function CohortDetail({
  cohort,
  roster,
  status = 'active',
  maxMembers = 100,
  postOpened = false,
  postStatus,
  onOpenMember,
  onArchive,
  actionPending = false,
  onSetCap,
  onRename,
  onSetDescription,
  onReopen,
  onOpenPost,
  onGroupReport,
  onDelete,
  onRemoveMember,
  canManageMembers = false,
  isAdmin = false,
  memberCount = 0,
  responseCount = 0,
}: {
  cohort: CohortSummary;
  roster: RosterMember[];
  status?: 'active' | 'archived';
  maxMembers?: number;
  postOpened?: boolean; // 사후 진단 개시 여부(개시 컨트롤 상태). ADR-55
  /** 마무리 체크 진행(U-8) — 없으면 독려 구획을 그리지 않는다(갤러리·픽스처가 그 자리다). */
  postStatus?: { done: number; total: number; pending: string[] };
  backHref?: string; // 셸 sub 뒤로 경로(→/coach). X2a 모드 셸 전환
  onOpenMember?: (id: string) => void;
  onArchive?: () => void | Promise<void>;
  /** 부모 액션이 도는 중(성능 감사 2026-08-25). 자체 busy 는 onXxx 가 resolve 되면 풀리는데,
   *  호출부는 그 뒤에 router.refresh() 를 돌린다 — 그 구간에도 버튼이 살아 있으면 다시 눌린다. */
  actionPending?: boolean;
  onSetCap?: (n: number) => void | Promise<void>;
  onRename?: (name: string) => void | Promise<void>; // 이름 수정 → updateCohort({name})
  onSetDescription?: (description: string | null) => void | Promise<void>; // 소개 수정 → updateCohort({description}). 빈 값=null
  onReopen?: () => void | Promise<void>; // 마감 복구 → updateCohort({status:'active'})
  onOpenPost?: () => void | Promise<void>; // 사후 진단 개시 → openPostWave(단방향 멱등). ADR-55
  onGroupReport?: () => void; // 회기 단위 집계 진입 → 그룹 리포트(코치 전용·리얼)
  onDelete?: () => void | Promise<void>; // 회기 하드삭제(파괴적) → deleteCohort. ADR-67
  onRemoveMember?: (userId: string, name: string) => void | Promise<void>; // 참여자 제거(휴지통) → removeCohortMember. ADR-73
  canManageMembers?: boolean; // 휴지통 노출 — 해당 회기 코치 또는 운영자만(서버 판정)
  isAdmin?: boolean; // 운영자 = 데이터 있는 회기도 삭제 가능(코치는 빈 회기만). ADR-67
  memberCount?: number; // 참여 수(삭제 가능 판정·컨펌 영향)
  responseCount?: number; // 응답 수(동)
}) {
  const care = roster.filter((m) => m.status === 'care');
  const done = roster.filter((m) => m.status === 'done');
  const pending = roster.filter((m) => m.status === 'pending');

  const [cap, setCap] = useState(maxMembers);
  const [name, setName] = useState(cohort.name);
  const [description, setDescription] = useState(cohort.description ?? '');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyAny = busy || actionPending; // 자체 액션 + 부모 refresh 구간
  const [shared, setShared] = useState<'link' | 'post' | null>(null); // 재공유 피드백(토스트 미의존)
  const archived = status === 'archived';

  // 삭제 가능 판정(ADR-67): 예약 general 회기(체험)는 불가(인프라). 운영자=임의 / 코치=빈 회기만(참여·응답 0).
  const isReserved = cohort.code === GENERAL_CODE;
  const isEmptyCohort = memberCount === 0 && responseCount === 0;
  const canDelete = !isReserved && (isAdmin || isEmptyCohort);

  const trimmedName = name.trim();
  const nameValid = trimmedName.length >= 1 && trimmedName.length <= 40;
  const nameChanged = trimmedName !== cohort.name;

  const normDesc = description.trim() === '' ? null : description.trim();
  const descChanged = normDesc !== (cohort.description ?? null);

  async function saveCap() {
    setBusy(true);
    try {
      await onSetCap?.(cap);
    } finally {
      setBusy(false);
    }
  }
  async function saveName() {
    setBusy(true);
    try {
      await onRename?.(trimmedName);
    } finally {
      setBusy(false);
    }
  }
  async function saveDescription() {
    setBusy(true);
    try {
      await onSetDescription?.(normDesc);
    } finally {
      setBusy(false);
    }
  }
  async function doReopen() {
    setBusy(true);
    try {
      await onReopen?.();
    } finally {
      setBusy(false);
    }
  }
  async function doOpenPost() {
    setBusy(true);
    try {
      await onOpenPost?.();
    } finally {
      setBusy(false);
    }
  }
  // 코드 재공유(정합 마감) — 코치가 상세에서 초대 코드/링크를 다시 공유. Web Share, 미지원 시 링크 복사 폴백(A5·ADR-49 로직 동형).
  async function shareInvite() {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/join?code=${cohort.code}`;
    const text = `미래의 나 체크에 초대합니다. 코드 ${cohort.code} 를 입력하고 5분만 시간 내 주세요.`;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: '미래의 나 체크 초대', text, url });
      } catch {
        // 사용자 취소·공유 실패 — 조용히(코드가 화면에 노출됨).
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared('link');
      setTimeout(() => setShared(null), 1500);
    } catch {
      // 클립보드 불가(비보안 컨텍스트) — 화면의 코드를 직접 전달.
    }
  }
  /**
   * 마무리 안내 — **참여자 홈이 쓰는 확정 문안 두 줄 + 주소**를 그대로 보낸다(`_vocab/postNudge`).
   *   문구를 여기서 짓지 않는 이유: 참여자가 **카톡에서 읽는 말과 로그인해서 보는 말이 같아야** 한다.
   *   다르면 «다른 것을 말하나» 하고 멈춘다. 관용구는 위 `shareInvite` 와 같다(Web Share → 클립보드).
   */
  async function sharePostNudge() {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const text = postNudgeText(cohort.name, cohort.id, origin);
    const url = `${origin}${postJoinHref(cohort.id)}`;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: POST_OPEN_HEAD, text, url });
      } catch {
        // 사용자 취소·공유 실패 — 조용히(아래 복사로 다시 시도할 수 있다).
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setShared('post');
      setTimeout(() => setShared(null), 1500);
    } catch {
      // 클립보드 불가(비보안 컨텍스트) — 화면의 주소를 직접 전달.
    }
  }

  async function doArchive() {
    setBusy(true);
    try {
      await onArchive?.();
    } finally {
      setBusy(false);
      setConfirmArchive(false);
    }
  }
  async function doDelete() {
    setBusy(true);
    try {
      await onDelete?.(); // 성공 시 래퍼가 목록으로 이동(회기 소멸)
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div>
      {/* **헤더는 껍데기가 그린다**(U-3 · §12.3 규칙 1). 제목·뒤로는 `_lib/screenChrome` 표가 든다. */}

      {/* ★★ **접힘이라는 사실이 줄 자체에서 읽혀야 한다**(U-10 · 지휘부 지시 2026-09-03
          「펼침, 접힘 기능인가? 그렇다면 (관리 버튼 대신) 접힘 느낌이 들도록 UI 를 고치자」).

          전에는 **오른쪽 끝 작은 버튼** 하나였고, 열려도 라벨이 그대로에 `aria-expanded` 도 없었다.
          그래서 누르면 «위에 다른 것이 생기고 원래 것이 아래로 내려간» 것처럼 보여
          **「두 화면」으로 읽혔다** — 지휘부 관찰이 정확히 그것이었다.

          ★ **새로 그리지 않았다** — `core/ui/Disclosure` 가 이미 있고 **ADR-88 이 규격을 확정**해 뒀다.
            그 부품 자체가 *같은 실패를 두 번 겪고* 나온 것이다(ADR-88: 「화살표를 두 차례 고쳤는데도
            여전히 '누를 수 있는 줄'로 분간되지 않았다 — 아이콘 하나로 풀리지 않는 문제라 구조를 바꾼다」).
            **핵심은 아이콘이 아니라 글자다** — 오른쪽 「펼치기」/「접기」가 지금 열려 있는지까지 말한다.

          ★ 요약 줄은 **낱말을 새로 짓지 않았다** — 안에 있는 항목 이름을 그대로 잇는다.
          ★ 콘솔에서 `.ui-disc` 를 쓰는 **첫 자리**다(실측 0건). 부품은 인스트루먼트 중립이라 제약이 없다.
          ★ 본문은 접혀도 DOM 에 남는다(CSS 가 감춘다) — 전에는 조건부 마운트라 열 때마다 입력이 초기화됐다. */}
      <Disclosure title="관리" summary="이름 · 소개 · 정원 · 마감">
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <span className="t-body" style={{ color: 'var(--color-text)' }}>이름</span>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginTop: 'var(--space-1)' }}>
              <input
                style={nameInputStyle}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                aria-label="회기 이름"
              />
              <Button variant="ghost" onClick={saveName} disabled={busy || !nameValid || !nameChanged}>저장</Button>
            </div>
          </div>
          <div>
            <span className="t-body" style={{ color: 'var(--color-text)' }}>
              소개 <span className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>(선택 · 미리보기에 보여요)</span>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="이 회기를 소개하는 글 (선택)"
              aria-label="회기 소개"
              style={{ ...nameInputStyle, minHeight: 72, padding: 'var(--space-3)', resize: 'vertical', marginTop: 'var(--space-1)', display: 'block', width: '100%' }}
            />
            <Button variant="ghost" onClick={saveDescription} disabled={busyAny || !descChanged} style={{ marginTop: 'var(--space-2)' }}>소개 저장</Button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="t-body" style={{ color: 'var(--color-text)' }}>정원</span>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <Stepper value={cap} min={1} max={100} onChange={setCap} label="정원" />
              <Button variant="ghost" onClick={saveCap} disabled={busyAny || cap === maxMembers}>저장</Button>
            </div>
          </div>
          {/* 마무리 체크 개시 — 세미나 종료 후 코치가 수동 개시(단방향·멱등). 참여자 홈에 '마무리 체크 하기' 노출(B-2). ADR-55
              ★★ **개시된 뒤에는 이 줄을 걷는다**(U-9 · 반증자가 잡았다). U-8 이 본문에 독려 구획을 세우면서
                「마무리 체크」가 **한 화면에 둘**이 됐다 — 위(관리)는 「개시됨」 뱃지, 아래(본문)는 「n/m 완료」.
                개시는 **단방향**이라 열린 뒤 이 자리에 남는 것은 **아무 동작도 없는 뱃지**뿐이고,
                「열렸다」는 사실은 본문 구획이 **서 있는 것 자체로** 말한다(지휘부 목표 「중복없이」). */}
          {!postOpened ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ minWidth: 0 }}>
                <span className="t-body" style={{ color: 'var(--color-text)' }}>{TOOL.post}</span>
                <div className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>세미나를 마친 뒤 열어 주세요</div>
              </div>
              <Button variant="ghost" onClick={doOpenPost} disabled={busyAny}>{TOOL.post} 개시</Button>
            </div>
          ) : null}
          {archived ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <p className="t-caption" style={{ color: 'var(--color-text-muted)', margin: 0 }}>이미 마감된 회기예요.</p>
              <Button variant="ghost" onClick={doReopen} disabled={busyAny} style={{ width: '100%' }}>다시 열기</Button>
            </div>
          ) : !confirmArchive ? (
            <Button variant="ghost" onClick={() => setConfirmArchive(true)} disabled={busyAny} style={{ width: '100%' }}>회기 마감</Button>
          ) : (
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button variant="ghost" onClick={() => setConfirmArchive(false)} style={{ flex: 1 }}>취소</Button>
              <Button onClick={doArchive} disabled={busyAny} style={{ flex: 1 }}>마감 확정</Button>
            </div>
          )}

          {/* 회기 삭제(파괴적·ADR-67) — 예약 체험 회기는 숨김. 코치+데이터 있으면 마감 유도, 운영자 또는 빈 회기면 삭제(위험색·2단계 컨펌·영향 표시). */}
          {isReserved ? null : !canDelete ? (
            <p className="t-caption" style={{ color: 'var(--color-text-muted)', margin: 0 }}>
              참여자·응답이 있어 삭제할 수 없어요. 마감을 이용해 주세요.
            </p>
          ) : !confirmDelete ? (
            <Button variant="ghost" onClick={() => setConfirmDelete(true)} disabled={busyAny} style={{ width: '100%', color: 'var(--care-text)', borderColor: 'var(--care-text)' }}>
              회기 삭제
            </Button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <p className="t-caption" style={{ color: 'var(--care-text)', margin: 0 }}>
                {isEmptyCohort
                  ? '이 회기를 삭제할까요? 되돌릴 수 없어요.'
                  : `참여 ${memberCount} · 응답 ${responseCount} 이 있는 회기예요. 삭제하면 되돌릴 수 없어요.`}
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={busyAny} style={{ flex: 1 }}>취소</Button>
                <Button onClick={doDelete} disabled={busyAny} style={{ flex: 1, background: 'var(--care-text)' }}>삭제 확정</Button>
              </div>
            </div>
          )}
        </section>
      </Disclosure>

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <Stat n={done.length} label="응답 완료" color="var(--color-primary)" />
        <Stat n={pending.length} label="대기" color="var(--color-text-muted)" />
        <Stat n={care.length} label="돌봄" color="var(--care-text)" />
      </div>

      {/* 회기 단위 집계 — 1주차 오프닝 핵심(그룹 평균·분포). 코치 전용 리얼 리포트. */}
      {onGroupReport ? (
        <Button onClick={onGroupReport} style={{ width: '100%', marginBottom: 'var(--space-3)' }}>
          그룹 리포트 보기
        </Button>
      ) : null}

      {/* ★★ **마무리 체크 독려**(U-8 · 지휘부 지시 2026-09-03). 개시된 회기에만 선다.
          **위 3숫자는 wave 를 안 가른다** — 사전만 낸 사람도 「응답 완료」다. 그래서 마무리는 따로 센다.
          **새 부품 0** — 이 화면이 이미 쓰는 `Group`·`Button` 이고, 문구는 참여자 홈의 확정 문안을 읽는다.
          미완료가 0이면 명단도 버튼도 그리지 않는다(빈 상태 문장을 새로 짓지 않는다). */}
      {postOpened && postStatus ? (
        <Group title={TOOL.post}>
          <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-2)' }}>
            <span className="tnum">{postStatus.done}</span> / <span className="tnum">{postStatus.total}</span> 완료
          </p>
          {postStatus.pending.length > 0 ? (
            <>
              {/* ★ **「아직 안 함」을 쓰지 않는다**(지휘부 지적 2026-09-03) — 아래 명단 묶음에
                  같은 낱말이 **다른 뜻**(응답이 0건인 사람)으로 서 있어 한 화면에 두 뜻이 됐다.
                  **새 문안이 아니다** — 갈무리 인도자 화면이 이미 쓰는 어휘다
                  (`checkin/page.tsx:62` — 제출 / 작성 중 / **미작성**).
                  ⚠ **「작성 중」은 여기에 없다** — 진단 응답에는 그 상태가 존재하지 않는다.
                  `responses` 에 미제출 상태가 없고(제출 = 행 생성), 서버 초안은 **인도자에게 0행**이며
                  (`response_drafts` 정책 넷이 전부 `user_id = auth.uid()`), 자동 저장은 localStorage 뿐이라
                  서버에 닿지도 않는다. 갈무리가 3단계인 것은 `checkin_save` 가 **자동으로 서버에 쓰기** 때문이다. */}
              <p className="t-caption" style={{ color: 'var(--color-text-muted)', margin: '0 0 var(--space-3)' }}>
                미작성 — {postStatus.pending.join(' · ')}
              </p>
              <Button variant="ghost" onClick={sharePostNudge} style={{ width: '100%' }}>
                {shared === 'post' ? '링크 복사됨 ✓' : '안내 보내기'}
              </Button>
            </>
          ) : null}
        </Group>
      ) : null}

      {/* ★ **「회차 갈무리」로 가는 문은 띠의 탭이 든다**(U-6 · 「중복없이, 일관된 위치」).
          바로 위 탭과 같은 목적지를 본문이 또 내면 한 화면에 문이 둘이고, 이름도 둘이 된다
          (탭 「회차 갈무리」 vs 본문 「회차 갈무리 현황」).
          **「그룹 리포트 보기」는 남긴다** — 그것은 탭에 없는 화면이라 본문이 유일한 문이다. */}

      {care.length > 0 && (
        <Group title="먼저 챙길 분" color="var(--care-text)">
          {care.map((m) => (
            <RosterRow key={m.userId} member={m} onOpen={onOpenMember} onRemove={onRemoveMember} canRemove={canManageMembers} />
          ))}
        </Group>
      )}

      <Group title="응답 완료">
        {done.length ? (
          done.map((m) => <RosterRow key={m.userId} member={m} onOpen={onOpenMember} onRemove={onRemoveMember} canRemove={canManageMembers} />)
        ) : (
          <p className="t-caption" style={{ color: 'var(--color-text-muted)' }}>아직 없어요.</p>
        )}
      </Group>

      <Group title="아직 안 함">
        {pending.map((m) => (
          <RosterRow key={m.userId} member={m} onRemove={onRemoveMember} canRemove={canManageMembers} />
        ))}
      </Group>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--space-4)',
          background: 'var(--color-surface-1)',
          borderRadius: 'var(--radius)',
        }}
      >
        <span className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          참여 코드 <strong className="tnum" style={{ color: 'var(--color-primary)', letterSpacing: 2 }}>{cohort.code}</strong>
        </span>
        <button
          type="button"
          onClick={shareInvite}
          className="t-caption"
          style={{ minHeight: 'var(--tap-min)', padding: '0 var(--space-4)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border-strong)', background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer' }}
        >
          {shared === 'link' ? '링크 복사됨 ✓' : '다시 공유'}
        </button>
      </div>
    </div>
  );
}
