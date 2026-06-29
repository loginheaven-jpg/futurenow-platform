// 갈망 거울 시각(ADR-27 하드룰) — ② 나침반 방향 + ③ 갈망 문장. participantMirror 산출 문자열만 렌더.
// **측정 비노출**: severity·점수·활력 버킷 라벨(시들음/중간/번성)·돌봄 신호 0건 — 이 컴포넌트는 점수를 받지 않는다.
// 참여자 완료(§7.5)와 멤버 내 리포트(Step 1.3) **공용 시각** — 새 시각 언어를 만들지 않는다. accent 골드만.
export interface ParticipantMirrorView {
  direction: string;
  longing: string;
  faith?: string;
}

export function MirrorView({ mirror }: { mirror: ParticipantMirrorView }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* ② 나침반 거울(골드 톤 방향 — 측정 아님) */}
      <div style={{ borderLeft: '3px solid var(--color-accent)', paddingLeft: 'var(--space-4)' }}>
        <p className="t-body-lg" style={{ color: 'var(--color-primary)', margin: 0 }}>{mirror.direction}</p>
      </div>
      {/* ③ 갈망의 한 문장 */}
      <p className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 19, lineHeight: 1.6, margin: 0 }}>{mirror.longing}</p>
    </section>
  );
}
