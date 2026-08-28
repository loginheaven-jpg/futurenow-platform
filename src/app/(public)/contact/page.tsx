// 문의 — 공개(S-4).
//
// **메일이 아니라 저장으로 간다.** 발송 수단 실측(2026-08-27): 메일 의존성 0 · 코드 내 발송 호출 0 ·
//   Edge Function 0 · 메일 env 키 0 · Auth 발송 실적은 복구 1건 시도뿐(ADR-79 가 '도달 못 함'으로
//   판정한 경로). **보낼 곳이 없다.** 그래서 제출을 DB 에 적재하고 운영자가 콘솔에서 읽는다 —
//   제출이 실재하는 곳으로 가므로 **죽은 폼이 아니다.** SMTP 가 서면 알림만 얹으면 된다.
import type { Metadata } from 'next';
import { createServerContext } from '@/core/supabase/server';
import { ContactForm } from './ContactForm';

export const metadata: Metadata = { title: '문의' };
export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  const ctx = await createServerContext();
  const me = await ctx.currentUser().catch(() => null);
  const muted = { color: 'var(--color-text-secondary)' } as const;

  return (
    <div className="pc-shell" style={{ maxWidth: 720 }}>
      <h1 className="t-h1" style={{ color: 'var(--color-primary)' }}>문의</h1>
      <p className="t-body" style={{ ...muted, marginTop: 'var(--space-2)' }}>
        남겨 주시면 운영자가 확인하고 답을 드립니다. 연락받으실 곳을 함께 적어 주시면 더 빠릅니다.
      </p>
      {/* 로그인 상태면 이름을 채워 둔다. 계정이 함께 기록되므로 누가 보냈는지도 남는다. */}
      <ContactForm defaultName={me?.name ?? ''} defaultEmail={me?.email ?? ''} />
      {/* **「처음으로」를 걷었다**(U-4 §5) — 껍데기 로고가 같은 자리를 대신한다.
          목적지가 같고(`/`) **4폭 전부에서 로고가 실제로 보인다**는 실브라우저 실측을 받고 걷었다. */}
    </div>
  );
}
