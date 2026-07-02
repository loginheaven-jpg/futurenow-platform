'use client';
// §8.3 차수 상세 — 돌봄 우선 명단. 3숫자 요약 + 명단 3묶음(먼저 챙길 분/응답 완료/아직 안 함).
// 덜 쓰는 관리(마감·정원)는 헤더 메뉴. 인도자 화면이라 상태 배지에 의미색 허용(참여자 화면 아님).
import { useState, type CSSProperties, type ReactNode } from 'react';
import { Button, ListRow, Stepper } from '@/core/ui';
import { AppHeader } from '../AppHeader';
import type { CohortSummary, RosterMember } from '../types';

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
  backHref,
  onOpenMember,
  onArchive,
  onSetCap,
  onRename,
  onSetDescription,
  onReopen,
  onOpenPost,
  onGroupReport,
  headerActions,
}: {
  cohort: CohortSummary;
  roster: RosterMember[];
  status?: 'active' | 'archived';
  maxMembers?: number;
  postOpened?: boolean; // 사후 진단 개시 여부(개시 컨트롤 상태). ADR-55
  backHref?: string; // 셸 sub 뒤로 경로(→/coach). X2a 모드 셸 전환
  onOpenMember?: (id: string) => void;
  onArchive?: () => void | Promise<void>;
  onSetCap?: (n: number) => void | Promise<void>;
  onRename?: (name: string) => void | Promise<void>; // 이름 수정 → updateCohort({name})
  onSetDescription?: (description: string | null) => void | Promise<void>; // 소개 수정 → updateCohort({description}). 빈 값=null
  onReopen?: () => void | Promise<void>; // 마감 복구 → updateCohort({status:'active'})
  onOpenPost?: () => void | Promise<void>; // 사후 진단 개시 → openPostWave(단방향 멱등). ADR-55
  onGroupReport?: () => void; // 차수 단위 집계 진입 → 그룹 리포트(코치 전용·리얼)
  headerActions?: ReactNode; // 셸 헤더 우측(로그아웃·내 정보). 미리보기는 미전달 → 렌더 0.
}) {
  const care = roster.filter((m) => m.status === 'care');
  const done = roster.filter((m) => m.status === 'done');
  const pending = roster.filter((m) => m.status === 'pending');

  const [manageOpen, setManageOpen] = useState(false);
  const [cap, setCap] = useState(maxMembers);
  const [name, setName] = useState(cohort.name);
  const [description, setDescription] = useState(cohort.description ?? '');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState<'link' | null>(null); // 재공유 피드백(토스트 미의존)
  const archived = status === 'archived';

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
    const text = `미래의 나 진단에 초대합니다. 코드 ${cohort.code} 를 입력하고 5분만 시간 내 주세요.`;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: '미래의 나 진단 초대', text, url });
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
  async function doArchive() {
    setBusy(true);
    try {
      await onArchive?.();
    } finally {
      setBusy(false);
      setConfirmArchive(false);
    }
  }

  return (
    <div>
      <AppHeader variant="sub" title={cohort.name} subtitle={archived ? '마감됨' : '진행 중'} backHref={backHref} homeHref="/home" action={headerActions} />

      {/* 관리(마감·정원) — 헤더 메뉴. 인도자 화면이라 의미색 허용 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-3)' }}>
        <button
          type="button"
          onClick={() => setManageOpen((o) => !o)}
          className="t-caption"
          style={{ minHeight: 'var(--tap-min)', padding: '0 var(--space-3)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius)', background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer' }}
        >
          관리
        </button>
      </div>
      {manageOpen ? (
        <section style={{ padding: 'var(--space-4)', background: 'var(--color-surface-1)', borderRadius: 'var(--radius)', marginBottom: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <span className="t-body" style={{ color: 'var(--color-text)' }}>이름</span>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginTop: 'var(--space-1)' }}>
              <input
                style={nameInputStyle}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                aria-label="차수 이름"
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
              placeholder="이 차수를 소개하는 글 (선택)"
              aria-label="차수 소개"
              style={{ ...nameInputStyle, minHeight: 72, padding: 'var(--space-3)', resize: 'vertical', marginTop: 'var(--space-1)', display: 'block', width: '100%' }}
            />
            <Button variant="ghost" onClick={saveDescription} disabled={busy || !descChanged} style={{ marginTop: 'var(--space-2)' }}>소개 저장</Button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="t-body" style={{ color: 'var(--color-text)' }}>정원</span>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <Stepper value={cap} min={1} max={100} onChange={setCap} label="정원" />
              <Button variant="ghost" onClick={saveCap} disabled={busy || cap === maxMembers}>저장</Button>
            </div>
          </div>
          {/* 사후 진단 개시 — 세미나 종료 후 코치가 수동 개시(단방향·멱등). 참여자 홈에 '사후 진단하기' 노출(B-2). ADR-55 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ minWidth: 0 }}>
              <span className="t-body" style={{ color: 'var(--color-text)' }}>사후 진단</span>
              <div className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
                {postOpened ? '개시됨 — 참여자가 사후 진단에 참여할 수 있어요' : '세미나를 마친 뒤 열어 주세요'}
              </div>
            </div>
            {postOpened ? (
              <span className="t-caption" style={{ color: 'var(--color-accent)', whiteSpace: 'nowrap', fontWeight: 600 }}>개시됨</span>
            ) : (
              <Button variant="ghost" onClick={doOpenPost} disabled={busy}>사후 진단 개시</Button>
            )}
          </div>
          {archived ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <p className="t-caption" style={{ color: 'var(--color-text-muted)', margin: 0 }}>이미 마감된 차수예요.</p>
              <Button variant="ghost" onClick={doReopen} disabled={busy} style={{ width: '100%' }}>다시 열기</Button>
            </div>
          ) : !confirmArchive ? (
            <Button variant="ghost" onClick={() => setConfirmArchive(true)} disabled={busy} style={{ width: '100%' }}>차수 마감</Button>
          ) : (
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button variant="ghost" onClick={() => setConfirmArchive(false)} style={{ flex: 1 }}>취소</Button>
              <Button onClick={doArchive} disabled={busy} style={{ flex: 1 }}>마감 확정</Button>
            </div>
          )}
        </section>
      ) : null}

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <Stat n={done.length} label="응답 완료" color="var(--color-primary)" />
        <Stat n={pending.length} label="대기" color="var(--color-text-muted)" />
        <Stat n={care.length} label="돌봄" color="var(--care-text)" />
      </div>

      {/* 차수 단위 집계 — 1주차 오프닝 핵심(그룹 평균·분포). 코치 전용 리얼 리포트. */}
      {onGroupReport ? (
        <Button onClick={onGroupReport} style={{ width: '100%', marginBottom: 'var(--space-6)' }}>
          그룹 리포트 보기
        </Button>
      ) : null}

      {care.length > 0 && (
        <Group title="먼저 챙길 분" color="var(--care-text)">
          {care.map((m) => (
            <ListRow key={m.id} tone="care" title={m.name} subtitle={m.note} trailing="›" onClick={() => onOpenMember?.(m.id)} />
          ))}
        </Group>
      )}

      <Group title="응답 완료">
        {done.length ? (
          done.map((m) => <ListRow key={m.id} title={m.name} trailing="›" onClick={() => onOpenMember?.(m.id)} />)
        ) : (
          <p className="t-caption" style={{ color: 'var(--color-text-muted)' }}>아직 없어요.</p>
        )}
      </Group>

      <Group title="아직 안 함">
        {pending.map((m) => (
          <ListRow key={m.id} title={m.name} subtitle="미응답" />
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
