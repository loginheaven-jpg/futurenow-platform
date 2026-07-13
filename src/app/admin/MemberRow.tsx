'use client';
// 본부 멤버 행 — 이름 클릭 시 세부(신원+활동) 펼침 + 삭제(2단계 확인). 운영자 화면(§8.6, 의미색 허용).
//   세부는 이 행이 직접 조회(read-only·펼칠 때 1회·캐시). 삭제는 부모 핸들러(onDelete) — 토스트·갱신 중앙화.
//   삭제 확인은 영향(소유 인도 차수 개수)을 함께 고지 — 인지 삭제(코치 삭제 시 차수·응답 연쇄).
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
  flex: 1,
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
  onPromote,
  onDemote,
  onDelete,
}: {
  member: MemberSummary;
  isSelf: boolean;
  busy: boolean;
  onPromote: (id: string) => void;
  onDemote: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirm, setConfirm] = useState(false);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button type="button" onClick={toggle} aria-expanded={open} style={nameBtn}>
          <div className="t-body" style={{ color: 'var(--color-text)' }}>
            {member.name ?? '이름 미입력'}
            {isSelf ? <span className="t-caption" style={{ color: 'var(--color-text-muted)' }}> · 나</span> : null}
            <span aria-hidden className="t-caption" style={{ color: 'var(--color-text-muted)', marginLeft: 6 }}>{open ? '▲' : '▼'}</span>
          </div>
          <div className="t-caption" style={{ color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.email}</div>
        </button>
        <span className="t-caption" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{ROLE_LABEL[member.role] ?? member.role}</span>
        {member.role === 'user' ? (
          <Button onClick={() => onPromote(member.id)} disabled={busy}>{busy ? '처리 중…' : '인도자로 승격'}</Button>
        ) : member.role === 'coach' && !isSelf ? (
          <Button variant="ghost" onClick={() => onDemote(member.id)} disabled={busy}>{busy ? '처리 중…' : '멤버로 강등'}</Button>
        ) : null}
      </div>

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
                <Field label="참여 차수" value={detail.activity.enrolledCohorts.length ? detail.activity.enrolledCohorts.join(', ') : '—'} />
                {detail.activity.ownedCohorts.length ? (
                  <Field label="인도 차수" value={detail.activity.ownedCohorts.join(', ')} />
                ) : null}
              </dl>
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
                    이 계정과 관련 데이터가 영구 삭제돼요{detail.activity.ownedCohorts.length ? ` — 인도 차수 ${detail.activity.ownedCohorts.length}개도 함께 삭제됩니다` : ''}. 되돌릴 수 없어요.
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
