// 자료실 — 3단 권한(공개 / 참여자 / 인도자). 공개 라우트이나 **같은 경로에서 역할에 따라 섹션이 늘어난다**.
//
// **버킷은 비공개 하나뿐이다.** 공개분도 서명 URL 로 내준다 — 버킷이 둘이면 실수로 잘못된 쪽에
//   올리는 날이 오고, 그때는 되돌릴 수 없다(§6.0 의 사고). 인도자 자료를 public 버킷에 두지 않는다.
//
// **목록은 RLS 가 가른다.** 여기에 role 분기를 쓰지 않는다 — 쓰면 판정이 두 곳이 되고,
//   화면이 감추는 것은 안전장치가 아니다. 파일 접근은 `library_can_read` 가 한 번 더 막는다.
import type { Metadata } from 'next';
import { createServerContext } from '@/core/supabase/server';
import type { LibraryTier } from '@/contracts/domain';
import { LibraryList } from './LibraryList';

export const metadata: Metadata = { title: '자료실' };
export const dynamic = 'force-dynamic';

const SECTIONS: { tier: LibraryTier; title: string; note: string }[] = [
  { tier: 'public', title: '공개 자료', note: '누구나 보실 수 있습니다.' },
  { tier: 'member', title: '참여자 자료', note: '세미나에 참여하신 분께 열립니다.' },
  { tier: 'coach', title: '인도자 자료', note: '인도자에게 열립니다.' },
];

export default async function LibraryPage() {
  const ctx = await createServerContext();
  const items = await ctx.listLibrary().catch(() => []);
  const muted = { color: 'var(--color-text-secondary)' } as const;

  return (
    <div className="pc-shell">
      <h1 className="t-h1" style={{ color: 'var(--color-primary)' }}>자료실</h1>
      <p className="t-body" style={{ ...muted, marginTop: 'var(--space-2)' }}>
        내려받으신 파일 링크는 잠시 뒤 만료됩니다. 필요할 때 이 자리에서 다시 받으세요.
      </p>

      {SECTIONS.map((s) => {
        const mine = items.filter((i) => i.tier === s.tier);
        // **빈 섹션은 그리지 않는다.** 자격이 없어 목록이 비었는데 제목만 뜨면
        // "여기 뭔가 있는데 못 본다"는 신호가 되고, 그것은 자료실이 할 말이 아니다.
        if (mine.length === 0) return null;
        return (
          <section key={s.tier} style={{ marginTop: 'var(--space-6)' }}>
            <h2 className="t-body" style={{ fontWeight: 600 }}>{s.title}</h2>
            <p className="t-caption" style={{ ...muted, marginTop: 'calc(var(--space-1) * -1)' }}>{s.note}</p>
            <LibraryList items={mine.map((i) => ({ id: i.id, title: i.title, description: i.description, path: i.storagePath }))} />
          </section>
        );
      })}

      {items.length === 0 ? (
        <p className="t-body" style={{ ...muted, marginTop: 'var(--space-5)' }}>아직 올라온 자료가 없습니다.</p>
      ) : null}

      {/* **「처음으로」를 걷었다**(U-4 §5) — 껍데기 로고가 같은 자리를 대신한다.
          목적지가 같고(`/`) **4폭 전부에서 로고가 실제로 보인다**는 실브라우저 실측을 받고 걷었다. */}
    </div>
  );
}
