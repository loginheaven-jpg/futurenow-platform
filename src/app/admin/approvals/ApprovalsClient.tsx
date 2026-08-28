'use client';
// 가입 승인 큐 화면 — 시안 P4. **운영자 전용 화면이라 상태 배지를 쓴다**(참여자 화면 비노출 · §7.3).
//
// **부품 부재로 골격에 머문 곳이 있다**(§7.2 보고 대상): 승인 큐 표 · 날짜 입력 · 단일행 입력 ·
//   PC 브레이크포인트. 지휘부가 넷을 승인했으나 `design_system.md` 에 아직 사양이 없어,
//   여기서는 **기존 토큰과 `ui-*` 클래스로 조립 가능한 범위까지만** 만들었다(CLAUDE §8).
//   새 색·새 시각 언어를 만들지 않았다 — 표는 기본 `<table>` + 역할 토큰뿐이다.
import { useState, useTransition } from 'react';
import type { MemberState } from '@/contracts/domain';
import { decideMembershipAction } from './actions';

export interface QueueRowView {
  bucket: 'pending' | 'expiring';
  userId: string;
  name: string | null;
  email: string | null;
  forumName: string | null;
  forumPhoneMasked: string | null; // **마스킹된 값만** 온다. 원값은 서버에서 잘렸다.
  signupNote: string | null;
  state: MemberState;
  validUntil: string | null;
  createdAt: string;
}

const muted = { color: 'var(--color-text-secondary)' } as const;
const cell: React.CSSProperties = {
  padding: 'var(--space-3)',
  borderBottom: '1px solid var(--color-border)',
  verticalAlign: 'top',
  textAlign: 'left',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

export function ApprovalsClient({
  rows,
  defaultValidUntil,
  currentUserId,
}: {
  rows: QueueRowView[];
  defaultValidUntil: string | null;
  currentUserId: string;
}) {
  const pending = rows.filter((r) => r.bucket === 'pending');
  const expiring = rows.filter((r) => r.bucket === 'expiring');
  const [pendingTx, startTx] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [until, setUntil] = useState<Record<string, string>>({});

  function decide(row: QueueRowView, decision: 'individual' | 'held') {
    if (pendingTx) return;
    setBusyId(row.userId);
    setMsg(null);
    startTx(async () => {
      const res = await decideMembershipAction({
        userId: row.userId,
        decision,
        validUntil: until[row.userId] ?? defaultValidUntil,
        note: notes[row.userId] ?? null,
      });
      setBusyId(null);
      if (!res.ok) setMsg(res.error);
    });
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <h1 className="t-h1">가입 승인</h1>
      <p className="t-body" style={{ ...muted, marginTop: 'var(--space-2)' }}>
        일반 가입 신청의 <b>가입 경위</b>를 보고 자격을 확인합니다. 포럼 정보가 함께 오면 명단과 대조합니다.
        승인하면 상시 체크가 열립니다.
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-5)', flexWrap: 'wrap' }}>
        <div className="ui-card" style={{ padding: 'var(--space-4)', minWidth: 160 }}>
          <div className="t-h1">{pending.length}</div>
          <div className="t-caption" style={muted}>승인 대기</div>
        </div>
        <div className="ui-card" style={{ padding: 'var(--space-4)', minWidth: 160 }}>
          <div className="t-h1">{expiring.length}</div>
          <div className="t-caption" style={muted}>만료 임박 · 30일 이내</div>
        </div>
      </div>

      {msg ? <p className="t-caption" style={{ ...muted, marginTop: 'var(--space-4)' }}>{msg}</p> : null}

      <h2 className="t-body" style={{ fontWeight: 600, marginTop: 'var(--space-6)' }}>승인 대기</h2>
      {/* 시안 P4 의 캡션 — 대조 키가 신청자 자기 신고임을 운영자에게 알린다.
          **소건 4 로 대조 키가 가입 경위로 승격**됐으므로 캡션도 그 축을 말한다. */}
      <p className="t-caption" style={{ ...muted, marginTop: 'var(--space-1)' }}>
        가입 경위와 포럼 정보는 모두 신청자가 직접 적은 것입니다. 포럼 정보는 선택 항목이라 비어 있을 수 있습니다.
      </p>

      {pending.length === 0 ? (
        <p className="t-body" style={{ ...muted, marginTop: 'var(--space-4)' }}>대기 중인 신청이 없습니다.</p>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 'var(--space-3)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                {/* 소건 4 — **가입 경위가 대조 키다.** 열 순서가 곧 읽는 순서라 앞으로 옮긴다.
                    포럼 칸은 보조 근거로 그 뒤에 남는다(지우지 않는다 — 기존 행이 그것만 갖고 있다). */}
                {['신청자', '가입 경위', '포럼 가입 이름 · 연락처', '계정 이메일', '신청일', '처리'].map((h) => (
                  <th key={h} className="t-caption" style={{ ...cell, ...muted, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pending.map((r) => {
                const matched = r.forumName || r.forumPhoneMasked;
                const isSelf = r.userId === currentUserId; // 자기 자신은 RPC 가 막는다 — 화면도 누르지 못하게
                return (
                  <tr key={r.userId}>
                    <td className="t-body" style={cell}>{r.name ?? '이름 없음'}</td>
                    {/* 대조 키 — 승격됐으므로 본문 굵기로 읽는다. */}
                    <td className="t-body" style={cell}>
                      {r.signupNote ? (
                        r.signupNote
                      ) : (
                        // **하위호환**: 소건 4 이전 신청은 경위 칸이 비어 있다(그때는 선택 항목이었다).
                        //   그 행을 "부실 신청" 으로 보이게 하면 운영자가 잘못 판단한다 —
                        //   비어 있는 것이 **신청자 탓이 아니라 그때의 양식 탓**임을 화면이 말한다.
                        <span style={muted}>
                          경위 미기재
                          <span style={{ display: 'block' }}>
                            {matched ? '포럼 정보로 대조해 주세요(양식 개편 전 신청).' : '양식 개편 전 신청입니다.'}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="t-caption" style={cell}>
                      {matched ? (
                        <>
                          <b>{r.forumName ?? '이름 미기재'}</b>
                          <span style={muted}>{r.forumPhoneMasked ? ` · ${r.forumPhoneMasked}` : ''}</span>
                        </>
                      ) : (
                        // 소건 4 이후로는 **비어 있는 것이 정상**이다(선택 항목).
                        //   옛 문구 `명단 대조 안 됨` 은 실패로 읽혀 승인을 주저하게 만든다.
                        <span style={muted}>{r.signupNote ? '미기재(선택 항목)' : '없음'}</span>
                      )}
                    </td>
                    <td className="t-caption" style={{ ...cell, ...muted }}>{r.email ?? '—'}</td>
                    <td className="t-caption" style={{ ...cell, ...muted }}>{fmtDate(r.createdAt)}</td>
                    <td style={cell}>
                      <div style={{ display: 'grid', gap: 'var(--space-2)', minWidth: 220 }}>
                        <label className="t-caption" style={muted}>
                          유효기간
                          <input
                            type="date"
                            className="ui-textarea"
                            style={{ display: 'block', width: '100%', minHeight: 44, padding: 'var(--space-2)' }}
                            value={until[r.userId] ?? defaultValidUntil ?? ''}
                            onChange={(e) => setUntil((s) => ({ ...s, [r.userId]: e.target.value }))}
                          />
                        </label>
                        <label className="t-caption" style={muted}>
                          근거 메모
                          <input
                            type="text"
                            maxLength={200}
                            className="ui-textarea"
                            style={{ display: 'block', width: '100%', minHeight: 44, padding: 'var(--space-2)' }}
                            value={notes[r.userId] ?? ''}
                            onChange={(e) => setNotes((s) => ({ ...s, [r.userId]: e.target.value }))}
                          />
                        </label>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <button
                            type="button"
                            className="ui-btn ui-btn--primary"
                            disabled={pendingTx || isSelf}
                            onClick={() => decide(r, 'individual')}
                          >
                            {busyId === r.userId && pendingTx ? '처리 중…' : '승인'}
                          </button>
                          <button
                            type="button"
                            className="ui-btn ui-btn--ghost"
                            disabled={pendingTx || isSelf}
                            onClick={() => decide(r, 'held')}
                          >
                            보류
                          </button>
                        </div>
                        {isSelf ? (
                          <span className="t-caption" style={muted}>자기 자신은 처리할 수 없습니다.</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="t-body" style={{ fontWeight: 600, marginTop: 'var(--space-6)' }}>만료 임박 · 30일 이내</h2>
      {expiring.length === 0 ? (
        <p className="t-body" style={{ ...muted, marginTop: 'var(--space-3)' }}>임박한 계정이 없습니다.</p>
      ) : (
        <div style={{ marginTop: 'var(--space-3)', display: 'grid', gap: 'var(--space-2)' }}>
          {expiring.map((r) => (
            <div key={r.userId} className="ui-listrow">
              <span className="t-body">{r.name ?? '이름 없음'}</span>
              <span className="t-caption" style={muted}>{r.validUntil} 만료</span>
            </div>
          ))}
        </div>
      )}
      {/* 시안 P4 하단 문구 — 자격의 만료가 기록의 몰수가 되어서는 안 된다. */}
      <p className="t-caption" style={{ ...muted, marginTop: 'var(--space-4)' }}>
        만료된 계정은 새 체크 응시가 닫히되, 이미 실시한 결과의 열람은 본인에게 계속 열려 있습니다.
      </p>
    </div>
  );
}
