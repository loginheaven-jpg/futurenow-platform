// 가치 카드 — 인도자 열람(ADR-121 · V-11).
//
// RLS 로 열기만 하고 화면을 안 만들면 순수한 노출면 증가다(2차 검토 S2-7). 그래서 같이 만든다.
// 접근은 `value_assessments` SELECT 정책이 정한다 — 본인 · **그 회기** 인도자 · 운영자.
//   다른 회기 인도자는 정책에서 막히므로 여기서 빈 목록을 본다. 페이지도 역할을 한 번 더 본다(심층 방어).
// 참여자가 적은 원문(대조 세 칸·라벨)이 그대로 보인다 — 그래서 참여자 화면에 열람 고지를 넣었다(§5-3).
import { redirect } from 'next/navigation';
import { requestCohort, requestContext, requestUser } from '@/app/_lib/requestScope';
import { CARD_BY_ID } from '@/instruments/futurenow/values';
import { COMPARE } from '@/instruments/futurenow/values/copy';

export const dynamic = 'force-dynamic';

const ALIGN_LABEL: Record<string, string> = {
  aligned: '같다', different: '다르다', unsure: '모르겠다', skipped: '건너뜀',
};

export default async function CoachValuesPage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  // ★ **한 렌더에 한 번만 묻는다**(ADR-178 · U-6 이 콘솔로 넓혔다) — 껍데기가 이미 물은 것을 다시 묻지 않는다.
  const ctx = await requestContext();
  const me = await requestUser();
  if (!me) redirect('/login');
  if (me.role !== 'coach' && me.role !== 'admin') redirect('/home');

  const cohort = await requestCohort(cohortId).catch(() => null);
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

      {/* **부제를 본문 첫 줄이 든다**(최박사 결재 2026-09-01 · U-3 후속).
          헤더가 껍데기로 가며 `subtitle` 이 사라졌다 — 표는 라우트의 성질만 들고
          회기 이름 같은 **서버 데이터**를 못 들기 때문이다. 실측상 그때 이 화면 어디에도
          회기 이름이 없었다(헤더·탭 줄·본문·시트 전부 X).
          **새 부품을 만들지 않았다** — 이 화면이 이미 쓰던 `t-caption` 보조 줄 패턴이다.
          제목은 헤더가 들고 있으므로 `t-h1` 을 또 두면 제목이 둘이 된다.
          헤더 부제 통로가 서면 U-4 에서 옮길지 판단한다(표에 그 사실을 적었다). */}
      {/* ★★ **회기 이름은 띠의 칩이 든다**(U-6 · 지휘부 결재 2026-09-03 「중복없이, 일관된 위치」).
          U-4 가 이 줄을 세울 때의 근거는 *「실측상 이 화면 어디에도 회기 이름이 없었다」* 였고,
          U-5 가 띠에 칩을 세우면서 **그 근거가 사실이 아니게 됐다** — 같은 문자열이 한 화면에 둘이었다.
          최박사 결재 2026-09-01(**본문이 든다**)은 «표가 들지 말라» 는 것이었고, 지금 이름을 드는 것도
          표가 아니라 **회기 레이아웃이 서버에서 읽어 넘긴 값**이다. 지휘부가 그 자리를 칩으로 확정했다. */}
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
