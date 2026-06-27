'use client';
// 코어 응답 러너 — 시각부(design_system §4). 블록 흐름·위젯 렌더·진행·필수 게이팅·완료 시 saveResponse.
// 비시각 책임 중 제약 무작위 배열(ordering)·필수 검증을 포함. 진행 저장/재개는 후속(주석).
// 참여자 화면 경고색 금지(§0.4): 필수 미충족 안내는 담담한 muted 카피.
import { useEffect, useMemo, useState } from 'react';
import type {
  AnswerValue,
  Block,
  CheckScale,
  Item,
  LikertScale,
  NumericScale,
  ResponseRunnerProps,
  StandardBlock,
  TextScale,
} from '@/contracts';
import {
  Button,
  CheckRow,
  DotScale,
  NumberSlider,
  ProgressBar,
  SegmentBar,
  StickyScaleHeader,
  TextArea,
} from '@/core/ui';
import { applyOrdering } from './ordering';

const stdItems = (b: Block): Item[] => (b.kind === 'standard' ? (b as StandardBlock).items : []);
const isAnswered = (v: AnswerValue | undefined): boolean => v !== undefined && v !== null && v !== '';

function orderBlock(b: Block): Block {
  if (b.kind !== 'standard') return b;
  return { ...b, items: applyOrdering(b.items, b.ordering) };
}

export function ResponseRunner({ schema, context, cohortId, wave, onComplete }: ResponseRunnerProps) {
  // 초기 렌더는 선언 순서(SSR 안전). 마운트 후 제약 무작위 배열 1회 적용(응답마다 새 순서).
  // 의도된 2-pass: 서버/하이드레이션은 고정 순서 → 클라이언트 마운트 후 셔플(하이드레이션 불일치 회피).
  const [blocks, setBlocks] = useState<Block[]>(schema.blocks);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 후 1회 클라이언트 셔플(의도)
    setBlocks(schema.blocks.map(orderBlock));
  }, [schema]);

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);

  const setAnswer = (code: string, v: AnswerValue) => setAnswers((a) => ({ ...a, [code]: v }));

  const allItems = useMemo(() => blocks.flatMap(stdItems), [blocks]);
  const totalRequired = useMemo(() => allItems.filter((i) => i.required).length, [allItems]);
  const answeredRequired = allItems.filter((i) => i.required && isAnswered(answers[i.code])).length;

  const block = blocks[step];
  const blockDone = stdItems(block).every((i) => !i.required || isAnswered(answers[i.code]));
  const isLast = step === blocks.length - 1;

  async function submit() {
    setSubmitting(true);
    try {
      const user = await context.currentUser();
      const responseId = await context.saveResponse({
        instrumentId: schema.instrumentId,
        cohortId,
        userId: user?.id ?? null,
        wave,
        answers,
        subjectProfile: {}, // 진단별 참여 프로필 수집은 별도 화면(후속) — 여기선 빈 스냅샷
      });
      setDoneId(responseId);
      onComplete(responseId);
    } finally {
      setSubmitting(false);
    }
  }

  if (doneId) {
    return (
      <main style={page}>
        <h1 className="t-h1">고맙습니다.</h1>
        <p className="t-body-lg" style={{ color: 'var(--color-text-secondary)' }}>
          응답이 저장되었습니다. 여기 적은 모든 것은 인도자 한 사람만 봅니다.
        </p>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <ProgressBar value={answeredRequired} max={totalRequired} />
      </div>

      <BlockView block={block} answers={answers} onAnswer={setAnswer} />

      {!blockDone && (
        <p className="t-caption" style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-4)' }}>
          남은 문항을 채워 주세요.
        </p>
      )}

      <nav style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            이전
          </Button>
        )}
        <span style={{ flex: 1 }} />
        {!isLast ? (
          <Button onClick={() => setStep(step + 1)} disabled={!blockDone}>
            다음
          </Button>
        ) : (
          <Button onClick={submit} disabled={!blockDone || submitting}>
            제출
          </Button>
        )}
      </nav>
    </main>
  );
}

const page: React.CSSProperties = {
  maxWidth: 560,
  margin: '0 auto',
  padding: 'var(--space-6) var(--space-4)',
};

function BlockView({
  block,
  answers,
  onAnswer,
}: {
  block: Block;
  answers: Record<string, AnswerValue>;
  onAnswer: (code: string, v: AnswerValue) => void;
}) {
  const items = stdItems(block);
  const likertScale = items.find((i) => i.scale.kind === 'likert')?.scale as LikertScale | undefined;

  return (
    <section>
      <h2 className="t-h2" style={{ margin: '0 0 var(--space-3)' }}>
        {block.kind === 'standard' ? block.title : ''}
      </h2>
      {block.kind === 'standard' && block.intro ? (
        <p className="t-body-lg" style={{ whiteSpace: 'pre-line', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-6)' }}>
          {block.intro}
        </p>
      ) : null}

      {/* 리커트 블록: 척도 레이블 상단 고정 */}
      {likertScale ? (
        <StickyScaleHeader
          minLabel={likertScale.minLabel}
          maxLabel={likertScale.maxLabel}
          centerLabel={likertScale.centerLabel}
        />
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {items.map((item) => (
          <ItemView key={item.code} item={item} value={answers[item.code]} onChange={(v) => onAnswer(item.code, v)} />
        ))}
      </div>
    </section>
  );
}

function ItemView({
  item,
  value,
  onChange,
}: {
  item: Item;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
}) {
  const num = typeof value === 'number' ? value : null;

  switch (item.scale.kind) {
    case 'bipolar': {
      const s = item.scale;
      return (
        <div>
          {item.prompt ? <p className="t-body-lg" style={promptStyle}>{item.prompt}</p> : null}
          <SegmentBar points={s.points} leftLabel={s.leftLabel} rightLabel={s.rightLabel} value={num} onChange={onChange} />
        </div>
      );
    }
    case 'likert':
      // 리커트는 행(prompt 좌 + 도트 우)으로 스택
      return (
        <div className="ui-dotscale__row">
          <span className="ui-dotscale__prompt t-body">{item.prompt}</span>
          <DotScale points={item.scale.points} value={num} onChange={onChange} ariaLabel={item.prompt} />
        </div>
      );
    case 'numeric': {
      const s = item.scale as NumericScale;
      return <NumberSlider label={item.prompt} min={s.min} max={s.max} value={num} onChange={onChange} suffix={s.suffix} />;
    }
    case 'text': {
      const s = item.scale as TextScale;
      return (
        <div>
          {item.prompt ? <p className="t-body-lg" style={promptStyle}>{item.prompt}</p> : null}
          <TextArea
            value={typeof value === 'string' ? value : ''}
            onChange={onChange}
            placeholder={s.placeholder}
            rows={s.multiline ? 4 : 2}
            maxLen={s.maxLen}
            ariaLabel={item.prompt || s.placeholder}
          />
        </div>
      );
    }
    case 'check': {
      const s = item.scale as CheckScale;
      return <CheckRow label={s.label} checked={value === true} onChange={onChange} />;
    }
    default:
      return null;
  }
}

const promptStyle: React.CSSProperties = { margin: '0 0 var(--space-3)', color: 'var(--color-text)' };
