// 갈무리 열람 렌더러(ADR-86). readModel 이 만든 ReadBlock[] 을 그린다 — 표시 전용, 상태·서버호출 0.
//   참여자 카드(read 모드)와 인도자 명단 펼침이 이 한 컴포넌트를 공유한다.
//   파괴적 액션(사진 삭제 등)을 두지 않는다. 읽는 화면에 지우는 버튼을 두지 않는다.
//   신규 클래스를 만들지 않는다 — t-* 와 역할 토큰만(ADR-82 F6: 미정의 ui-input 으로 입력칸이 사라진 실사고).
import type { CheckinPhoto } from '@/contracts';
import { type ReadBlock } from './readModel';
import { WORKBOOK_TITLE } from './workbook';

const labelStyle = { color: 'var(--color-text-secondary)' } as const;
const valueStyle = { color: 'var(--color-text)', whiteSpace: 'pre-line' as const };
const helpStyle = { color: 'var(--color-text-muted)' } as const;

function Row({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 'var(--space-2) 0', borderTop: 'var(--border-hair) solid var(--color-border)' }}>
      <div className="t-caption" style={labelStyle}>{label}</div>
      <div className="t-body" style={valueStyle}>{children}</div>
      {help ? <div className="t-caption" style={helpStyle}>{help}</div> : null}
    </div>
  );
}

// 워크북 사진(ADR-197) — 맨 위 한 자리. 작은 미리보기를 그리고 누르면 원본이 열린다
//   (손글씨는 72px 로는 읽히지 않는다 — 보관의 뜻은 다시 읽을 수 있는 데 있다).
//   미리보기가 없는 옛 업로드(ADR-197 이전)는 원본을 그린다.
//   `overlay` 는 인도자 명단 펼침이 **운영자 삭제 표시**를 얹는 자리다(ADR-197 — 모아 보기에서 옮겨 왔다).
//   이 줄은 그 표시를 모른다 — 읽는 화면(CheckinReadView)은 overlay 를 넘기지 않는다.
export function WorkbookPhotoStrip({ photos, overlay }: { photos: CheckinPhoto[]; overlay?: (p: CheckinPhoto) => React.ReactNode }) {
  if (photos.length === 0) return null;
  return (
    <div style={{ padding: 'var(--space-2) 0' }}>
      <div className="t-caption" style={labelStyle}>{WORKBOOK_TITLE}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', paddingTop: 'var(--space-2)' }}>
        {photos.map((p) => (
          <div key={p.path} style={{ position: 'relative' }}>
            <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', lineHeight: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.thumbUrl ?? p.url}
                alt={WORKBOOK_TITLE}
                style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 'var(--radius)', border: 'var(--border-hair) solid var(--color-border)' }}
              />
            </a>
            {overlay ? overlay(p) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Block({ block }: { block: ReadBlock }) {
  switch (block.kind) {
    case 'pair':
      return (
        <Row label={block.label} help={block.help}>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <span className="t-caption" style={{ ...labelStyle, minWidth: 56 }}>{block.fromLabel}</span>
            <span>{block.fromValue}</span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <span className="t-caption" style={{ ...labelStyle, minWidth: 56 }}>{block.toLabel}</span>
            <span>{block.toValue}</span>
          </div>
        </Row>
      );
    case 'text':
      return <Row label={block.label} help={block.help}>{block.value}</Row>;
    case 'list':
      return <Row label={block.label} help={block.help}>{block.values.join(' · ')}</Row>;
    case 'scale':
      // 막대·게이지·색·백분위 없이 숫자와 양끝 라벨만(ADR-80: 갈무리는 채점 대상 아님).
      return (
        <Row label={block.label} help={block.help}>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{block.value}</span>
          <span className="t-caption" style={{ ...helpStyle, marginLeft: 'var(--space-3)' }}>
            {block.leftLabel} — {block.rightLabel}
          </span>
        </Row>
      );
    case 'flag':
      return (
        <div style={{ padding: 'var(--space-2) 0', borderTop: 'var(--border-hair) solid var(--color-border)' }}>
          <div className="t-body" style={valueStyle}>☑ {block.label}</div>
          {block.help ? <div className="t-caption" style={helpStyle}>{block.help}</div> : null}
        </div>
      );
    case 'note':
      return (
        <div style={{ padding: 'var(--space-2) 0', borderTop: 'var(--border-hair) solid var(--color-border)' }}>
          <div className="t-caption" style={helpStyle}>{block.text}</div>
        </div>
      );
    case 'hidden':
      // 본인이 비공개로 둔 자리. 내용 0 — 참여자가 켠 토글 원문만 흐리게 남겨 '미작성'과 구분시킨다.
      return (
        <div style={{ padding: 'var(--space-2) 0', borderTop: 'var(--border-hair) solid var(--color-border)' }}>
          <div className="t-caption" style={helpStyle}>☑ {block.label}</div>
        </div>
      );
    case 'group':
      return (
        <section style={{ paddingTop: 'var(--space-3)' }}>
          <div className="t-body-lg" style={{ color: 'var(--color-primary)' }}>{block.title}</div>
          {block.blocks.map((b, i) => <Block key={i} block={b} />)}
        </section>
      );
  }
}

/** ReadBlock[] 렌더. photos 는 **맨 위** 워크북 사진 자리에 한 번 붙는다(ADR-197 — 카드의 자리와 같다). */
export function CheckinReadView({ blocks, photos = [] }: { blocks: ReadBlock[]; photos?: CheckinPhoto[] }) {
  // 사진도 '적은 것'이다 — 글은 한 줄도 없이 워크북만 촬영해 붙인 갈무리가 빈 화면이 되면 안 된다.
  if (blocks.length === 0 && photos.length === 0) return null;
  return (
    <div>
      <WorkbookPhotoStrip photos={photos} />
      {blocks.map((b, i) => <Block key={i} block={b} />)}
    </div>
  );
}
