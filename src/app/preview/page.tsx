'use client';
// 디자인 시스템 미리보기 (개발용) — 색 토큰·위젯·러너 첫 화면 렌더 확인용. 운영 라우트 아님.
// 색값 판정(첫 화면)에 사용. 실제 응답 흐름은 코어 러너 + 인스트루먼트 스키마로 동작.
import { useState } from 'react';
import type { CoreContext } from '@/contracts';
import {
  Button,
  Card,
  CheckRow,
  DotScale,
  NumberSlider,
  ProgressBar,
  SegmentBar,
  StickyScaleHeader,
  TextArea,
} from '@/core/ui';
import { ResponseRunner } from '@/core/response/ResponseRunner';
import { futurenowFlow } from '@/instruments/futurenow/flow';

// 미리보기용 stub 코어 컨텍스트(저장은 가짜 id 반환).
const stubContext = {
  currentUser: async () => ({ id: 'preview', email: 'preview@local', name: '미리보기', nickname: null, role: 'user' }),
  saveResponse: async () => 'preview-response-id',
} as unknown as CoreContext;

function Gallery() {
  const [seg, setSeg] = useState<number | null>(4);
  const [dot, setDot] = useState<number | null>(4);
  const [gap, setGap] = useState<number | null>(7);
  const [chk, setChk] = useState(true);
  const [txt, setTxt] = useState('');
  return (
    <Card style={{ marginBottom: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <p className="t-h2" style={{ margin: '0 0 var(--space-3)', color: 'var(--color-primary)' }}>팔레트 미리보기</p>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button>주요 동작</Button>
          <Button variant="ghost">보조 동작</Button>
        </div>
      </div>
      <ProgressBar value={7} max={17} />
      <div>
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>나침반 — 세그먼트 바</p>
        <SegmentBar points={5} leftLabel="잘못될 경우를 먼저 본다" rightLabel="잘되었을 장면을 먼저 본다" value={seg} onChange={(v) => setSeg(v as number)} />
      </div>
      <div>
        <StickyScaleHeader minLabel="전혀 아니다" centerLabel="보통" maxLabel="매우 그렇다" />
        <div className="ui-dotscale__row">
          <span className="ui-dotscale__prompt t-body">아침에 눈을 뜰 때, 오늘 하루가 기대된다.</span>
          <DotScale points={5} value={dot} onChange={(v) => setDot(v as number)} />
        </div>
      </div>
      <NumberSlider label="일 (Work) — 성취와 보람" min={0} max={10} value={gap} onChange={(v) => setGap(v as number)} suffix="점" />
      <CheckRow label="세미나 참석과는 별도로, 인도자에게 1:1 코칭/상담을 받고 싶습니다." checked={chk} onChange={setChk} />
      <TextArea value={txt} onChange={setTxt} placeholder="떠오르는 대로 적어 주세요." rows={3} maxLen={500} ariaLabel="미리보기 주관식" />
    </Card>
  );
}

export default function PreviewPage() {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <header
        style={{
          background: 'var(--color-primary)',
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div className="t-h1" style={{ color: 'var(--color-text-on-accent)' }}>퓨처나우</div>
        <div className="t-caption" style={{ color: 'var(--color-accent)' }}>미래의 나를 만나는 시간</div>
      </header>
      <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-6)' }}>
        디자인 시스템 v1 — 색 역할: 네이비=앱의 틀 / 골드=참여자의 흔적.
      </p>
      <Gallery />
      <hr style={{ border: 0, borderTop: 'var(--border-hair) solid var(--color-border)', margin: 'var(--space-6) 0' }} />
      <ResponseRunner
        schema={futurenowFlow.getSchema('pre')}
        context={stubContext}
        cohortId={null}
        wave="pre"
        onComplete={() => {}}
      />
    </div>
  );
}
