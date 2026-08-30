// 그룹 리포트 블록 0~4 — **인도자 전용 편성·돌봄 도구**(ORDER group_report v2).
//
// **순수 컴포넌트다.** 조회하지 않는다 — 페이지가 이름을 조인해 뷰모델로 넘긴다(발주 §3 공통).
//   집계는 `groupModel.ts` 의 순수 함수가 하고 여기서는 **그리기만** 한다.
//
// **의미색 규율**(경계 4) — `CARE_TONE` 은 **돌봄 블록에만** 쓴다.
//   활력·함정·간격은 네이비·회색 계열이다. 활력 구간색(`VITALITY_ZONES.color`)은
//   **채도가 아니라 이름을 구별하는 용도**이고 이미 있는 표에서 온다(새 색 0).
//
// **design_system 부품 부재**(불변식 20) — 막대·칩·행은 확정 부품이 없어
//   이 저장소가 이미 쓰는 관용구(hairline 상자 · `t-caption`)를 차용했다. 새 디자인 0.
import type { CSSProperties } from 'react';
import { CARE_TONE } from './labels';
import {
  attendance, careList, vitalityBuckets, vitalityMean, trapGroups, gapGroups,
  displayName, CARE_TAG, type GroupMember,
} from './groupModel';

const panel: CSSProperties = {
  background: 'var(--color-surface-2)',
  border: 'var(--border-hair) solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-4)',
};
const muted = { color: 'var(--color-text-secondary)' } as const;
const faint = { color: 'var(--color-text-muted)' } as const;

/** 이름 → 개인 리포트. **새 창으로 연다**(발주 §3 공통 — 그룹 화면을 잃지 않는다). */
function NameLink({ m, cohortId, suffix }: { m: GroupMember; cohortId: string; suffix?: string }) {
  return (
    <a
      href={`/coach/cohort/${cohortId}/report/${m.responseId}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: 'inherit', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid transparent' }}
    >
      {displayName(m)}
      {suffix ? <span className="t-caption" style={{ ...faint, marginLeft: 2, fontWeight: 400 }}>{suffix}</span> : null}
    </a>
  );
}

function Block({ no, title, desc, children, foot }: {
  no: number; title: string; desc: string; children: React.ReactNode; foot?: string;
}) {
  return (
    <section style={panel}>
      <h2 className="t-h2" style={{ fontSize: 15, margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span
          aria-hidden
          style={{
            width: 22, height: 22, borderRadius: 7, background: 'var(--color-primary)',
            color: 'var(--color-text-on-accent)', fontSize: 12, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 22px',
          }}
        >{no}</span>
        {title}
      </h2>
      <p className="t-caption" style={{ ...muted, margin: 'var(--space-2) 0 var(--space-4)' }}>{desc}</p>
      {children}
      {foot ? <p className="t-caption" style={{ ...faint, margin: 'var(--space-4) 0 0' }}>{foot}</p> : null}
    </section>
  );
}

/** 가로 비율 막대 한 칸. 수는 **보이되 정렬에 쓰지 않는다**(불변식 11과 같은 결). */
function Track({ ratio, color, label }: { ratio: number; color: string; label: string }) {
  return (
    <div style={{ height: 22, background: 'var(--color-surface-sunken)', borderRadius: 7, overflow: 'hidden' }}>
      <div
        style={{
          width: `${Math.max(ratio * 100, ratio > 0 ? 8 : 0)}%`, height: '100%', background: color,
          borderRadius: 7, display: 'flex', alignItems: 'center', paddingLeft: 10,
          fontSize: 12, color: 'var(--color-text-on-accent)', fontWeight: 600,
        }}
      >{ratio > 0 ? label : ''}</div>
    </div>
  );
}

export function GroupDesign({
  cohortId, members, done,
}: {
  cohortId: string;
  /** 등록자 전원(이름 공급원). 페이지가 조인해서 넘긴다. */
  members: { userId: string; name: string | null }[];
  /** 응답을 마친 사람만. **분포·평균은 이 배열로만** 계산된다. */
  done: GroupMember[];
}) {
  const att = attendance(members, done);
  const care = careList(done);
  const bands = vitalityBuckets(done);
  const mean = vitalityMean(done);
  const traps = trapGroups(done);
  const gaps = gapGroups(done);
  const n = done.length || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* ── 블록 0 · 응답 현황 — **완료 / 미완료 두 단계**(ORDER v2). */}
      <Block
        no={0}
        title="응답 현황"
        desc={`아래 모든 분포와 평균은 체크를 완료한 ${done.length}명만으로 계산됩니다. 미완료가 많으면 그룹 전체를 대표하지 못합니다.`}
      >
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          {[
            { n: att.enrolled, l: '등록 인원', warn: false },
            { n: att.done.length, l: '체크 완료', warn: false },
            { n: att.pending.length, l: '미완료', warn: att.pending.length > 0 },
          ].map((s) => (
            <div
              key={s.l}
              style={{
                flex: 1, borderRadius: 'var(--radius)', padding: 'var(--space-3)',
                background: s.warn ? CARE_TONE.byVitality.fill : 'var(--color-surface-1)',
                border: s.warn ? `1px solid ${CARE_TONE.byVitality.line}` : 'none',
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: s.warn ? CARE_TONE.byVitality.text : 'var(--color-primary)' }}>{s.n}</div>
              <div className="t-caption" style={{ marginTop: 5, color: s.warn ? CARE_TONE.byVitality.text : 'var(--color-text-secondary)' }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 10, borderRadius: 6, background: 'var(--color-surface-sunken)', overflow: 'hidden', display: 'flex', marginBottom: 'var(--space-3)' }}>
          <i style={{ width: `${(att.done.length / (att.enrolled || 1)) * 100}%`, background: 'var(--color-primary)' }} />
          <i style={{ width: `${(att.pending.length / (att.enrolled || 1)) * 100}%`, background: CARE_TONE.byVitality.line }} />
        </div>
        <div className="t-caption" style={{ ...muted, lineHeight: 2 }}>
          <strong style={{ color: 'var(--color-text)' }}>완료</strong>{' '}
          {att.done.length === 0 ? <span style={faint}>없음</span> : att.done.map((m) => (
            <span key={m.userId} style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, background: 'var(--color-surface-sunken)', margin: '0 5px 5px 0' }}>
              <NameLink m={m} cohortId={cohortId} />
            </span>
          ))}
          <br />
          <strong style={{ color: 'var(--color-text)' }}>미완료</strong>{' '}
          {att.pending.length === 0 ? <span style={faint}>없음</span> : att.pending.map((p) => (
            <span
              key={p.userId}
              style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, margin: '0 5px 5px 0', background: CARE_TONE.byVitality.fill, border: `1px solid ${CARE_TONE.byVitality.line}`, color: CARE_TONE.byVitality.text }}
            >
              {p.name ?? '이름 없음'}
            </span>
          ))}
        </div>
      </Block>

      {/* ── 블록 1 · 돌봄 우선 명단 — **다른 모든 분석보다 위**(개인 리포트의 돌봄 배너와 같은 원칙). */}
      <Block
        no={1}
        title="돌봄 우선 명단"
        desc="다른 무엇보다 먼저 봅니다. 먼저 연락할 사람이며, 점수·문항을 언급하지 말고 안부부터 건네세요. 이름을 누르면 개인 리포트가 새 창으로 열립니다."
        foot={care.length ? '한 사람에게는 우선순위가 가장 높은 신호 하나만 표시됩니다(byVitality · byCareCheck · 시들음 순).' : undefined}
      >
        {care.length === 0 ? (
          <p className="t-body" style={muted}>지금 돌봄 신호가 켜진 분은 없습니다.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {care.map((r) => {
              const t = CARE_TONE[r.kind];
              return (
                <div
                  key={r.member.userId}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', borderRadius: 11, background: t.fill, border: `1px solid ${t.line}`, color: t.text }}
                >
                  <span aria-hidden style={{ width: 9, height: 9, borderRadius: '50%', background: t.text, flex: '0 0 9px' }} />
                  <span style={{ flex: '0 0 118px', fontSize: 14, fontWeight: 700 }}>
                    <NameLink m={r.member} cohortId={cohortId} suffix={`활력 ${r.vitality}`} />
                  </span>
                  <span className="t-caption" style={{ flex: 1, color: t.body }}>{r.body}</span>
                  <span className="t-caption" style={{ padding: '2px 8px', borderRadius: 5, background: 'rgba(255,255,255,.7)', border: '1px solid rgba(0,0,0,.06)', fontWeight: 700 }}>
                    {CARE_TAG[r.kind]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Block>

      {/* ── 블록 2 · 활력 분포 — **평균 한 숫자가 아니라 흩어진 모양**을 본다.
          ★ **「시들음」 막대의 살구색은 경계 4의 예외가 아니다**(지휘부 판정 2026-08-30).
            정본 `VITALITY_ZONES` 가 그 구간을 `tone: 'care'` 로 규정했고, 시들음 구간 자체가
            돌봄 신호다(「낙인이 아니라 돌봄 신호」). 경계 4가 금지한 것은 **임의 의미색**이지
            정본이 이미 care 로 규정한 색이 아니다. **개인 리포트 활력 띠와 동일 정본을 공유한다** —
            같은 개념을 인도자가 같은 것으로 읽어야 한다. */}
      <Block
        no={2}
        title="활력 분포"
        desc="평균 한 숫자가 아니라 어디에 몇 명이 흩어져 있는지를 봅니다. 괄호는 활력 총점(5~25)입니다."
        foot={`그룹 평균 ${mean === null ? '—' : mean.toFixed(1)} · 경계값(10과 11)은 벽이 아닙니다. 이름만 다를 뿐 거의 같은 자리입니다.`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {bands.map((b) => (
            <div key={b.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
              <div style={{ flex: '0 0 110px', paddingTop: 3 }}>
                <div className="t-body" style={{ margin: 0 }}>{b.name}</div>
                <div className="t-caption" style={faint}>{b.from}~{b.to}점</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Track ratio={b.members.length / n} color={b.color} label={`${b.members.length}명`} />
                <div className="t-caption" style={{ ...muted, marginTop: 7, lineHeight: 1.9 }}>
                  {b.members.length === 0 ? <span style={faint}>해당 없음</span> : b.members.map((m, i) => (
                    <span key={m.userId}>
                      {i > 0 ? ' · ' : ''}<NameLink m={m} cohortId={cohortId} suffix={`(${m.scores.vitality.score})`} />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Block>

      {/* ── 블록 3 · 함정 분포 — **조 편성의 1순위 기준**. */}
      <Block
        no={3}
        title="함정 분포 · 소그룹 편성"
        desc="주 함정이 같은 사람끼리 묶습니다. 한 사람이 자기 이야기를 하면 나머지가 자기 모습을 알아봅니다. 조 편성의 1순위 기준입니다. 괄호는 그 함정의 원점수입니다."
        foot="참여자에게 「함정」이라는 낱말을 그대로 쓰지 않습니다. 조를 부를 때는 중립적 이름(1조·2조)을 씁니다."
      >
        {/* `group-traps` — **인쇄에서도 가로를 유지한다**(globals.css @media print).
            세로로 무너지면 「조 편성」이라는 형태 자체가 사라진다. */}
        <div className="group-traps" style={{ display: 'flex', gap: 'var(--space-3)' }}>
          {traps.map((g) => (
            <div key={g.code} style={{ flex: 1, border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius)', padding: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}>{g.label}</span>
                <span className="t-caption" style={muted}>{g.members.length}명</span>
              </div>
              <div className="t-caption" style={{ ...faint, marginBottom: 11 }}>{g.desc}</div>
              <div className="t-caption" style={{ ...muted, lineHeight: 2 }}>
                {g.members.length === 0 ? <span style={faint}>해당 없음</span> : g.members.map((m, i) => (
                  <span key={m.userId}>
                    {i > 0 ? ' · ' : ''}<NameLink m={m} cohortId={cohortId} suffix={`(${m.scores.trap[g.code]})`} />
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Block>

      {/* ── 블록 4 · 가장 간절한 영역 — **조 편성 기준이 아니다.** */}
      <Block
        no={4}
        title="가장 간절한 영역"
        desc="각 참여자의 간격이 가장 큰 영역을 모았습니다. 조 편성 기준이 아니라 세션 예시와 강조점을 그룹에 맞추는 참고로 씁니다. 괄호는 그 영역의 점수(0~10)입니다."
        foot="두 영역이 같은 점수로 가장 간절한 경우 양쪽에 모두 나타납니다. 그래서 합이 인원수보다 클 수 있습니다."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {gaps.map((g) => (
            <div key={g.code} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
              <div className="t-body" style={{ flex: '0 0 110px', paddingTop: 3, margin: 0 }}>{g.label}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Track ratio={g.members.length / n} color="var(--color-primary)" label={`${g.members.length}명`} />
                <div className="t-caption" style={{ ...muted, marginTop: 7, lineHeight: 1.9 }}>
                  {g.members.length === 0 ? <span style={faint}>해당 없음</span> : g.members.map((x, i) => (
                    <span key={x.member.userId}>
                      {i > 0 ? ' · ' : ''}<NameLink m={x.member} cohortId={cohortId} suffix={`(${x.score})`} />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Block>
    </div>
  );
}
