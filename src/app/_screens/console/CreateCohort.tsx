'use client';
// §8.2 차수 개설 — 3스텝(정보 → 진단·정원 → 완료·코드 공유). 한 화면 한 질문, 진행바.
import { useState, type CSSProperties } from 'react';
import { Button, ProgressBar, Stepper } from '@/core/ui';
import { AppHeader } from '../AppHeader';

const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: 'var(--tap-min)',
  padding: '0 var(--space-3)',
  borderRadius: 'var(--radius)',
  border: 'var(--border-hair) solid var(--color-border)',
  background: 'var(--color-surface-2)',
  color: 'var(--color-text)',
  font: 'inherit',
  fontSize: 15,
};

function WaveCard({ active, title, desc, onClick }: { active: boolean; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        all: 'unset',
        flex: 1,
        cursor: 'pointer',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius)',
        border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
        background: active ? 'var(--color-accent-soft)' : 'var(--color-surface-2)',
      }}
    >
      <div className="t-body" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{title}</div>
      <div className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>{desc}</div>
    </button>
  );
}

export function CreateCohort({ code = 'RSTUV', onDone }: { code?: string; onDone?: () => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [wave, setWave] = useState<'pre' | 'post'>('pre');
  const [cap, setCap] = useState(10);

  return (
    <div>
      <AppHeader title="새 차수 만들기" subtitle={`${step} / 3 단계`} onBack={step > 1 ? () => setStep(step - 1) : undefined} />
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <ProgressBar value={step} max={3} />
      </div>

      {step === 1 && (
        <section>
          <h2 className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 18, margin: '0 0 var(--space-2)' }}>차수 이름을 정해 주세요</h2>
          <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>참여자에게 보이는 이름이에요.</p>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 2026 봄 미래의 나 1기" aria-label="차수 이름" />
          <Button onClick={() => setStep(2)} disabled={!name.trim()} style={{ width: '100%', marginTop: 'var(--space-6)' }}>다음</Button>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2 className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 18, margin: '0 0 var(--space-4)' }}>진단 종류와 정원</h2>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
            <WaveCard active={wave === 'pre'} title="사전 진단" desc="세미나 시작 전" onClick={() => setWave('pre')} />
            <WaveCard active={wave === 'post'} title="종료 진단" desc="세미나 마친 뒤" onClick={() => setWave('post')} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
            <span className="t-body" style={{ color: 'var(--color-text)' }}>정원</span>
            <Stepper value={cap} min={1} max={100} onChange={setCap} label="정원" />
          </div>
          <Button onClick={() => setStep(3)} style={{ width: '100%' }}>다음</Button>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2 className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 18, margin: '0 0 var(--space-2)' }}>차수가 만들어졌어요</h2>
          <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>아래 코드를 참여자에게 전해 주세요.</p>
          <div style={{ background: 'var(--color-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', textAlign: 'center', marginBottom: 'var(--space-4)' }}>
            <div className="t-display tnum" style={{ color: 'var(--color-accent)', letterSpacing: 6 }}>{code}</div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <Button variant="ghost" style={{ flex: 1 }}>코드 복사</Button>
            <Button variant="ghost" style={{ flex: 1 }}>초대 링크 공유</Button>
          </div>
          <div style={{ background: 'var(--color-surface-1)', border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius)', padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 0, whiteSpace: 'pre-line' }}>
              {`이렇게 전해 보세요 ↓\n"미래의 나 진단에 초대합니다. 코드 ${code} 를 입력하고 5분만 시간 내 주세요."`}
            </p>
          </div>
          <Button onClick={onDone} style={{ width: '100%' }}>완료</Button>
        </section>
      )}
    </div>
  );
}
