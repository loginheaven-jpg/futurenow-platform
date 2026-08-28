// 가치 카드 — 인도자 열람(ADR-121 · V-11).
//
// RLS 로 열기만 하고 화면을 안 만들면 순수한 노출면 증가다(2차 검토 S2-7). 그래서 같이 만든다.
// 접근은 `value_assessments` SELECT 정책이 정한다 — 본인 · **그 차수** 인도자 · 운영자.
//   다른 차수 인도자는 정책에서 막히므로 여기서 빈 목록을 본다. 페이지도 역할을 한 번 더 본다(심층 방어).
// 참여자가 적은 원문(대조 세 칸·라벨)이 그대로 보인다 — 그래서 참여자 화면에 열람 고지를 넣었다(§5-3).
import { redirect } from 'next/navigation';
import { createServerContext } from '@/core/supabase/server';
import { CARD_BY_ID } from '@/instruments/futurenow/values';
import { COMPARE } from '@/instruments/futurenow/values/copy';

export const dynamic = 'force-dynamic';

const ALIGN_LABEL: Record<string, string> = {
  aligned: '같다', different: '다르다', unsure: '모르겠다', skipped: '건너뜀',
};

export default async function CoachValuesPage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');
  if (me.role !== 'coach' && me.role !== 'admin') redirect('/home');

  const cohort = await ctx.getCohort(cohortId).catch(() => null);
  if (!cohort) redirect('/coach');

  const rows = await ctx.listCohortValueAssessments(cohortId);
  const done = rows.filter((r) => r.finalizedAt);

  const card = {
    padding: 'var(--space-4)', background: 'var(--color-surface-1)',
    border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius)',
    marginBottom: 'var(--space-3)',
  } as const;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* **헤더는 껍데기가 그린다**(U-3 · §12.3 규칙 1). 제목·뒤로는 `_lib/screenChrome` 표가 든다. */}

      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
        마친 분 {done.length}명 · 진행 중 {rows.length - done.length}명
      </p>

      {rows.length === 0 && <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>아직 아무도 시작하지 않았어요.</p>}

      {rows.map((r) => {
        const names = (r.finalIds ?? []).map((id) => CARD_BY_ID.get(id)?.korean).filter(Boolean);
        const labels = [r.labels.v1, r.labels.v2, r.labels.v3].filter(Boolean);
        const wb = [r.workbook.peak, r.workbook.strength, r.workbook.longing].filter(Boolean);
        return (
          <div key={r.userId} style={card}>
            <div className="t-body-lg" style={{ fontWeight: 600 }}>{r.userName ?? '이름 없음'}</div>
            {names.length === 3 ? (
              <>
                <div className="t-body">{names.join(' · ')}</div>
                {labels.length > 0 && (
                  <div className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>{labels.join(' · ')}</div>
                )}
                {wb.length > 0 && (
                  <div className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
                    {COMPARE.colWorkbook} — {wb.join(' · ')}
                  </div>
                )}
                {r.alignment && (
                  <div className="t-caption" style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>
                    대조 — {ALIGN_LABEL[r.alignment] ?? r.alignment}
                  </div>
                )}
              </>
            ) : (
              <div className="t-caption" style={{ color: 'var(--color-text-muted)' }}>
                진행 중 · 후보 {r.candidates?.length ?? 0}장
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
