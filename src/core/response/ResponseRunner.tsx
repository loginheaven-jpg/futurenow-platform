'use client';
// 코어 응답 러너 — 시각부(design_system §4). 블록 흐름·위젯 렌더·진행·필수 게이팅·완료 시 saveResponse.
// 비시각 책임 중 제약 무작위 배열(ordering)·필수 검증·진행 저장/재개(중간저장)를 포함(architecture §7).
// 중간저장 2층: localStorage 자동(투명) + [중간저장] 버튼 서버 보존(getDraft/saveDraft/clearDraft, RLS 본인 한정).
//   answers 만 저장(step 미저장 — 셔플 안전), 재개 시 draftLocation 으로 위치 재계산. cohortId 없으면(미리보기) 중간저장 비활성.
// 참여자 화면 경고색 금지(§0.4): 필수 미충족·저장 안내는 담담한 muted 카피.
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { clearLocalDraft, draftLocation, hasAnyAnswer, readLocalDraft, writeLocalDraft } from './draft';

const stdItems = (b: Block): Item[] => (b.kind === 'standard' ? (b as StandardBlock).items : []);
const isAnswered = (v: AnswerValue | undefined): boolean => v !== undefined && v !== null && v !== '';

function orderBlock(b: Block): Block {
  if (b.kind !== 'standard') return b;
  return { ...b, items: applyOrdering(b.items, b.ordering) };
}

export function ResponseRunner({ schema, context, cohortId, wave, onComplete, subjectProfile }: ResponseRunnerProps) {
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
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const draftEnabled = cohortId !== null; // 미리보기(cohortId=null)·비로그인 경로는 중간저장 비활성
  const resumedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setAnswer = (code: string, v: AnswerValue) => {
    setAnswers((a) => ({ ...a, [code]: v }));
    if (draftSaved) setDraftSaved(false); // 응답을 바꾸면 저장 확인 문구를 거둔다(현재 상태 ≠ 저장본)
  };

  // 재개 — 서버 draft 우선, 없으면 localStorage. answers 만 복원하고 위치(step)는 draftLocation 으로 재계산(셔플 안전). 1회.
  useEffect(() => {
    if (cohortId === null || resumedRef.current) return;
    resumedRef.current = true;
    let cancelled = false;
    (async () => {
      let restored: Record<string, AnswerValue> | null = null;
      try {
        restored = await context.getDraft<Record<string, AnswerValue>>({ instrumentId: schema.instrumentId, cohortId, wave });
      } catch {
        restored = null; // 서버 실패는 조용히 — localStorage 폴백
      }
      if (!hasAnyAnswer(restored)) restored = readLocalDraft(cohortId, wave);
      if (cancelled || !hasAnyAnswer(restored) || !restored) return;
      setAnswers(restored);
      setStep(draftLocation(schema.blocks, restored)); // 블록 ORDER 불변 → 셔플과 무관하게 안정
    })();
    return () => {
      cancelled = true;
    };
  }, [context, schema, cohortId, wave]);

  // localStorage 자동 저장(투명·디바운스 500ms). 빈 answers 는 쓰지 않는다(재개 전 local draft 클로버 방지).
  useEffect(() => {
    if (cohortId === null || !hasAnyAnswer(answers)) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => writeLocalDraft(cohortId, wave, answers), 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [answers, cohortId, wave]);

  async function saveDraftNow() {
    if (cohortId === null || savingDraft) return; // busy 가드(이중 제출 차단)
    setSavingDraft(true);
    try {
      await context.saveDraft({ instrumentId: schema.instrumentId, cohortId, wave, answers });
      writeLocalDraft(cohortId, wave, answers); // 로컬도 즉시 동기화
      setDraftSaved(true);
    } catch {
      setDraftSaved(false); // 실패 시 확인 문구 미표시(담담 — 다음 자동/수동 저장에서 재시도)
    } finally {
      setSavingDraft(false);
    }
  }

  const allItems = useMemo(() => blocks.flatMap(stdItems), [blocks]);
  const totalRequired = useMemo(() => allItems.filter((i) => i.required).length, [allItems]);
  const answeredRequired = allItems.filter((i) => i.required && isAnswered(answers[i.code])).length;
  const answeredAny = hasAnyAnswer(answers); // 중간저장 버튼 활성 조건(빈 응답이면 저장할 게 없음)

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
        subjectProfile: subjectProfile ?? {}, // 호출부가 수집한 참여 프로필(미전달 시 빈 스냅샷)
      });
      if (cohortId !== null) {
        try {
          await context.clearDraft({ cohortId, wave }); // 제출 성공 → 작성본 정리(서버)
        } catch {
          /* 정리 실패는 무시(제출 자체는 성공 — draft 는 다음 제출 시 덮어쓰기) */
        }
        clearLocalDraft(cohortId, wave); // 로컬도 제거
      }
      setDoneId(responseId);
      onComplete(responseId);
    } finally {
      setSubmitting(false);
    }
  }

  if (doneId) {
    return (
      <main style={page}>
        <h1 className="t-h1" style={{ color: 'var(--color-primary)' }}>고맙습니다.</h1>
        <p className="t-body-lg" style={{ color: 'var(--color-text-secondary)' }}>
          응답이 저장되었습니다. 여기 적은 모든 것은 인도자와 운영자만 봅니다.
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

      {/* 중간저장(서버 보존) — 미리보기/비로그인 경로 제외. localStorage 자동 저장과 별개의 명시적 보존. */}
      {draftEnabled && (
        <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
          <Button variant="ghost" onClick={saveDraftNow} disabled={savingDraft || !answeredAny}>
            {savingDraft ? '저장 중…' : '중간 저장하고 나중에 이어서'}
          </Button>
          {draftSaved && (
            <p className="t-caption" style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
              저장했어요. 이어서 할 수 있어요.
            </p>
          )}
        </div>
      )}
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
      <h2 className="t-h2" style={{ margin: '0 0 var(--space-3)', color: 'var(--color-primary)' }}>
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
          points={likertScale.points}
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
