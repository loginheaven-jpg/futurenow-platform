// 서가 — **목록은 제목과 권한만 말한다**(서가 A 뼈대).
//
// **감추지 않는다**(§5). 자격이 없어도 목록은 전원에게 보이고, 못 여는 것은 **못 연다고 적는다.**
//   감추면 «여기 뭔가 있는데 못 본다» 를 사용자가 추측으로 알게 되고, 그것이 더 나쁘다.
//
// **주소가 이 화면에 없다**(§4). `LibraryItem` 타입에 주소 칸이 아예 없어
//   규칙이 아니라 **타입으로** 막혔다. 자료를 여는 것은 `/library/[id]` 한 자리다.
//
// 헤더는 껍데기가 그린다(U-1). 제목은 `_lib/screenChrome` 표가 든다.
import type { Metadata } from 'next';
import { createServerContext } from '@/core/supabase/server';
import { LIBRARY_NAME } from '@/app/_vocab/library';
import { LibraryList } from './LibraryList';
import { UploadPanel } from './UploadPanel';

export const metadata: Metadata = { title: LIBRARY_NAME };
export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const ctx = await createServerContext();
  const [items, canUpload] = await Promise.all([
    ctx.listLibrary().catch(() => []),
    ctx.canUploadLibrary().catch(() => false),
  ]);
  const muted = { color: 'var(--color-text-secondary)' } as const;

  // 기수 목록은 **올릴 수 있는 사람에게만** 필요하다(자료에 소속을 달 때 고른다).
  const cohorts = canUpload ? await ctx.listMyCohorts().catch(() => []) : [];

  return (
    <div className="pc-shell">
      {/* **화면 제목은 본문이 든다** — 이 라우트는 `gnb` 라 제목 바가 서지 않는다(로고를 지키려고 그렇게 두었다).
          §12 개명의 「화면 제목」이 이 줄이다. 낱말은 `_vocab/library` 하나에서 온다. */}
      <h1 className="t-h1" style={{ color: 'var(--color-primary)' }}>{LIBRARY_NAME}</h1>

      <UploadPanel
        canUpload={canUpload}
        cohorts={cohorts.map((c) => ({ id: c.cohortId, name: c.name }))}
      />

      <section style={{ marginTop: 'var(--space-6)' }}>
        {items.length === 0 ? (
          <p className="t-body" style={muted}>아직 올라온 자료가 없습니다.</p>
        ) : (
          <LibraryList items={items} />
        )}
      </section>
    </div>
  );
}
