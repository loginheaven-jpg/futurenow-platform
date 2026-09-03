'use client';
// 본부 멤버 행 — 이름 클릭 시 세부(신원+활동) 펼침 + 삭제(2단계 확인). 운영자 화면(§8.6, 의미색 허용).
//   세부는 이 행이 직접 조회(read-only·펼칠 때 1회·캐시). 삭제는 부모 핸들러(onDelete) — 토스트·갱신 중앙화.
//   삭제 확인은 영향(소유 인도 회기 개수)을 함께 고지 — 인지 삭제(코치 삭제 시 회기·응답 연쇄).
import { memberStateLabel, holdGate, promoteGate } from './memberActions';
import { holdConfirm, holdCanProceed } from './approvals/holdConfirm';
import { useState } from 'react';
import { Button } from '@/core/ui';
import type { MemberSummary } from '@/contracts';
import { memberDetailAction, type MemberDetail } from './actions';

const ROLE_LABEL: Record<string, string> = { admin: '운영자', coach: '인도자', user: '멤버' };
const GENDER_LABEL: Record<string, string> = { 남: '남성', 여: '여성' }; // user_profiles.gender 저장값은 '남'/'여'(gender_two_values)

const cardStyle = {
  padding: 'var(--space-3) var(--space-4)',
  background: 'var(--color-surface-1)',
  border: 'var(--border-hair) solid var(--color-border)',
  borderRadius: 'var(--radius)',
} as const;

const nameBtn = {
  flex: '1 1 12rem', // **줄바꿈 뒤에도 이름이 한 줄로 읽히게** — 좁아지면 글자가 세로로 선다(캡처가 잡았다)
  minWidth: 0,
  textAlign: 'left',
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
} as const;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
      <dt className="t-caption" style={{ color: 'var(--color-text-muted)', width: 76, flexShrink: 0 }}>{label}</dt>
      <dd className="t-caption" style={{ color: 'var(--color-text)', margin: 0, wordBreak: 'break-all' }}>{value}</dd>
    </div>
  );
}

export function MemberRow({
  member,
  isSelf,
  busy,
  isSuperAdmin,
  currentUserId,
  onPromote,
  onDemote,
  onDelete,
  onSetPassword,
  onDecide,
}: {
  member: MemberSummary;
  isSelf: boolean;
  busy: boolean;
  /** 누른 사람이 슈퍼어드민인가 — **서버가 내린 값**이다(화면이 이메일로 판정하지 않는다). */
  isSuperAdmin: boolean;
  currentUserId: string;
  onPromote: (id: string) => void;
  onDemote: (id: string) => void;
  onDelete: (id: string) => void;
  onSetPassword: (id: string, password: string) => Promise<{ ok: boolean }>;
  /** 승급·보류 — 둘 다 `decideMembership` 을 지난다(5-2 가드가 실제 문이다). */
  onDecide: (id: string, decision: 'individual' | 'expired', note: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pw, setPw] = useState(''); // 임시 비번 입력
  const [pwConfirm, setPwConfirm] = useState(false); // 1단계 확인
  const [pwBusy, setPwBusy] = useState(false);
  // **보류 확인** — 5-2 에서 만든 모듈을 그대로 쓴다. 문구를 새로 짓지 않는다(§5).
  const [holdOpen, setHoldOpen] = useState(false);
  const [note, setNote] = useState('');

  const gateInput = {
    target: { id: member.id, role: member.role, memberState: member.memberState, isSuperAdmin: member.isSuperAdmin === true },
    actor: { id: currentUserId, isSuperAdmin },
  };
  const hold = holdGate(gateInput);
  const promote = promoteGate(gateInput);
  const confirmContent = holdConfirm({ name: member.name, email: member.email, targetIsAdmin: member.role === 'admin' });

  async function doSetPassword() {
    setPwBusy(true);
    const res = await onSetPassword(member.id, pw); // 부모(AdminClient)가 액션+토스트(전달용 비번 표기)
    setPwBusy(false);
    setPwConfirm(false);
    if (res.ok) setPw(''); // 성공 시 입력칸 비움(비번은 토스트로 전달)
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !detail && !loading) {
      setLoading(true);
      setFailed(false);
      const res = await memberDetailAction(member.id);
      if (res.ok) setDetail(res.detail);
      else setFailed(true);
      setLoading(false);
    }
  }

  const p = detail?.profile;
  return (
    <div style={cardStyle}>
      {/* **줄바꿈을 허용한다**(5-3) — 버튼이 둘 늘면서 390 에서 48px 넘쳤다(픽스처 캡처가 잡았다).
          색·글자·간격은 그대로이고 **한 줄 강제만 푼다** — 넘치는 것이 결함이지 간격이 결함이 아니다. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <button type="button" onClick={toggle} aria-expanded={open} style={nameBtn}>
          <div className="t-body" style={{ color: 'var(--color-text)' }}>
            {member.name ?? '이름 미입력'}
            {isSelf ? <span className="t-caption" style={{ color: 'var(--color-text-muted)' }}> · 나</span> : null}
            <span aria-hidden className="t-caption" style={{ color: 'var(--color-text-muted)', marginLeft: 6 }}>{open ? '▲' : '▼'}</span>
          </div>
          <div className="t-caption" style={{ color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.email}</div>
        </button>
        <span className="t-caption" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{ROLE_LABEL[member.role] ?? member.role}</span>
        {/* **회원 상태 열**(5-3 §2) — 서버가 내린 판정을 어휘로 옮겨 그리기만 한다.
            **상태로 목록을 거르지 않는다**(최박사 확정) — 보류한 사람도 보여야 되돌릴 수 있다. */}
        <span className="t-caption" style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
          {memberStateLabel(member.memberState)}
        </span>
        {member.role === 'user' ? (
          <Button onClick={() => onPromote(member.id)} disabled={busy}>{busy ? '처리 중…' : '인도자로 승격'}</Button>
        ) : member.role === 'coach' && !isSelf ? (
          <Button variant="ghost" onClick={() => onDemote(member.id)} disabled={busy}>{busy ? '처리 중…' : '멤버로 강등'}</Button>
        ) : null}
        {/* **승급·보류**(5-3 §3). 막혀도 **감추지 않는다** — 안 보이면 왜 없는지 모른다(§4).
            ★ 보류된 사람에게 **승급이 곧 해제**다(최박사 확정) — 별도 「해제」를 만들지 않는다. */}
        <Button
          variant="ghost"
          onClick={() => onDecide(member.id, 'individual', '')}
          disabled={busy || !promote.enabled}
          title={promote.reason ?? undefined}
        >
          {busy ? '처리 중…' : '승급'}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setHoldOpen(true)}
          disabled={busy || !hold.enabled}
          title={hold.reason ?? undefined}
        >
          보류
        </Button>
      </div>
      {hold.reason || promote.reason ? (
        <p className="t-caption" style={{ color: 'var(--color-text-muted)', margin: 'var(--space-1) 0 0' }}>
          {hold.reason ?? promote.reason}
        </p>
      ) : null}

      {holdOpen ? (
        <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: 'var(--border-hair) solid var(--color-border)' }}>
          {/* **셋만 뜬다** — 대상 · 잃는 것 · 근거 메모(필수). 「되돌리는 법」 줄은 최박사 확정으로 없다. */}
          <p className="t-body" style={{ margin: 0 }}>{confirmContent.who.name} · {confirmContent.who.email}</p>
          <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-1) 0' }}>{confirmContent.loses}</p>
          <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-2)' }}>{confirmContent.noteRequired}</p>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="근거 메모"
            style={{ width: '100%', minHeight: 'var(--tap-min)', padding: 'var(--space-2)' }}
          />
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Button
              onClick={() => { onDecide(member.id, 'expired', note); setHoldOpen(false); setNote(''); }}
              disabled={!holdCanProceed(note) || busy}
            >
              보류합니다
            </Button>
            <Button variant="ghost" onClick={() => { setHoldOpen(false); setNote(''); }}>그만두기</Button>
          </div>
        </div>
      ) : null}

      {open ? (
        <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: 'var(--border-hair) solid var(--color-border)' }}>
          {loading ? (
            <p className="t-caption" style={{ color: 'var(--color-text-muted)', margin: 0 }}>불러오는 중…</p>
          ) : failed ? (
            <p className="t-caption" style={{ color: 'var(--color-danger)', margin: 0 }}>세부정보를 불러오지 못했어요.</p>
          ) : detail ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {/* 신원 (운영자 전용 — 전화·주소·계좌 포함) */}
              <dl style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', margin: 0 }}>
                <Field label="전화" value={detail.contact?.phone ?? '—'} />
                <Field label="주소" value={detail.contact?.address ?? '—'} />
                <Field label="계좌" value={detail.contact?.bankAccount ?? '—'} />
                <Field label="성별" value={p?.gender ? (GENDER_LABEL[p.gender] ?? p.gender) : '—'} />
                <Field label="출생연도" value={p?.birthYear != null ? `${p.birthYear}년` : '—'} />
                <Field label="종교" value={p?.religion ?? '—'} />
                <Field label="신앙연수" value={p?.faithYears != null ? `${p.faithYears}년` : '—'} />
              </dl>
              {/* 활동 */}
              <dl style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', margin: 0 }}>
                <Field label="응답 수" value={`${detail.activity.responseCount}건`} />
                <Field label="참여 회기" value={detail.activity.enrolledCohorts.length ? detail.activity.enrolledCohorts.join(', ') : '—'} />
                {detail.activity.ownedCohorts.length ? (
                  <Field label="인도 회기" value={detail.activity.ownedCohorts.join(', ')} />
                ) : null}
              </dl>
              {/* 비밀번호 리셋(임시·계정 복구) — 입력 후 [비번 리셋] → 1단계 확인 → 변경. 최소 8자. ADR-79 */}
              <div style={{ paddingTop: 'var(--space-2)', borderTop: 'var(--border-hair) solid var(--color-border)' }}>
                <div className="t-caption" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>비밀번호 리셋 (임시)</div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <input
                    type="text"
                    value={pw}
                    onChange={(e) => { setPw(e.target.value); setPwConfirm(false); }}
                    placeholder="임시 비밀번호 (8자 이상)"
                    aria-label="임시 비밀번호"
                    style={{ flex: 1, minWidth: 0, minHeight: 'var(--tap-min)', padding: '0 var(--space-3)', borderRadius: 'var(--radius)', border: 'var(--border-hair) solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text)', font: 'inherit', fontSize: 15 }}
                  />
                  {!pwConfirm ? (
                    <Button variant="ghost" onClick={() => setPwConfirm(true)} disabled={pwBusy || pw.trim().length < 8}>비번 리셋</Button>
                  ) : null}
                </div>
                {pwConfirm ? (
                  <div style={{ marginTop: 'var(--space-2)', padding: 'var(--space-3)', background: 'var(--color-surface-sunken)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <p className="t-caption" style={{ color: 'var(--color-text)', margin: 0 }}>
                      <strong>{member.name ?? member.email}</strong> 님의 비밀번호를 <strong style={{ color: 'var(--color-primary)' }}>{pw}</strong> 로 바꿀까요? 사용자에게 전달하고, 로그인 후 변경하도록 안내하세요.
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                      <Button variant="ghost" onClick={() => setPwConfirm(false)} disabled={pwBusy}>취소</Button>
                      <Button onClick={doSetPassword} disabled={pwBusy}>{pwBusy ? '변경 중…' : '변경'}</Button>
                    </div>
                  </div>
                ) : null}
              </div>
              {/* 삭제 */}
              {isSelf ? (
                <p className="t-caption" style={{ color: 'var(--color-text-muted)', margin: 0 }}>본인 계정은 여기서 삭제할 수 없어요.</p>
              ) : !confirm ? (
                <div>
                  <Button variant="ghost" onClick={() => setConfirm(true)} disabled={busy} style={{ color: 'var(--color-danger)' }}>멤버 삭제</Button>
                </div>
              ) : (
                <div style={{ padding: 'var(--space-3)', background: 'var(--color-surface-sunken)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <p className="t-caption" style={{ color: 'var(--color-danger)', margin: 0 }}>
                    이 계정과 관련 데이터가 영구 삭제돼요{detail.activity.ownedCohorts.length ? ` — 인도 회기 ${detail.activity.ownedCohorts.length}개도 함께 삭제됩니다` : ''}. 되돌릴 수 없어요.
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                    <Button variant="ghost" onClick={() => setConfirm(false)} disabled={busy}>취소</Button>
                    <Button onClick={() => onDelete(member.id)} disabled={busy} style={{ background: 'var(--color-danger)', color: 'var(--color-text-on-accent)' }}>{busy ? '삭제 중…' : '삭제 확정'}</Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
