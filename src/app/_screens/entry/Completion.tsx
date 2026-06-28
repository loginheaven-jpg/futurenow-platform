'use client';
// §7.5 참여자 완료 — 부드러운 자기 반영. 구조=앱(이 파일), 언어=인스트루먼트(mirror 문자열).
// 참여자 팔레트만(네이비 틀 + 골드 흔적 + 중립). danger/warning/care 의미색·severity·점수·등급 0건.
// mirror 없으면 ①마무리 헤더 + ④인도자 핸드오프만(우아한 저하) — 빈/깨진 화면 금지.
import { Button } from '@/core/ui';

// 인스트루먼트 ParticipantMirror 와 구조적으로 동일한 뷰 형(앱은 인스트루먼트 타입에 의존하지 않는다).
export interface ParticipantMirrorView {
  direction: string;
  longing: string;
  faith?: string;
}

// ①·④ 는 점수에 의존하지 않는 고정 카피 → 항상 렌더(저하 시에도). ②③⑤ 는 mirror 가 있을 때만.
const HEADER = '수고하셨어요. 스스로를 가만히 들여다보는 건 쉽지 않은 일이에요. 끝까지 함께해 주셔서 고마워요.';
const HANDOFF = '당신이 적어 준 마음을, 당신의 인도자가 함께 살펴볼 거예요. 곧 따뜻한 이야기로 만나요.';

export function Completion({ mirror, onFinish }: { mirror?: ParticipantMirrorView | null; onFinish?: () => void }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <h1 className="t-h1" style={{ color: 'var(--color-primary)', fontSize: 22, margin: '0 0 var(--space-4)' }}>마치며</h1>

      {/* ① 마무리 헤더(고정) */}
      <p className="t-body-lg" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-6)' }}>{HEADER}</p>

      {mirror ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
          {/* ② 나침반 거울(골드 톤 방향 — 측정 아님) */}
          <div style={{ borderLeft: '3px solid var(--color-accent)', paddingLeft: 'var(--space-4)' }}>
            <p className="t-body-lg" style={{ color: 'var(--color-primary)', margin: 0 }}>{mirror.direction}</p>
          </div>
          {/* ③ 갈망의 한 문장 */}
          <p className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 19, lineHeight: 1.6, margin: 0 }}>{mirror.longing}</p>
        </section>
      ) : null}

      {/* ④ 인도자 핸드오프(고정, 항상) */}
      <div style={{ background: 'var(--color-surface-1)', border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{HANDOFF}</p>
      </div>

      {/* ⑤ 믿음 한 줄(선택 — F1·F2 응답 시) */}
      {mirror?.faith ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-6)' }}>{mirror.faith}</p>
      ) : (
        <div style={{ height: 'var(--space-4)' }} />
      )}

      {/* ⑥ 마치기 */}
      <Button onClick={onFinish} style={{ width: '100%' }}>마치기</Button>
    </div>
  );
}
