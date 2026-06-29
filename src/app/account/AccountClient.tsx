'use client';
// 계정 수정 오케스트레이션 — 이름·전화(서버액션) + 비번(클라이언트 supabase.auth.updateUser). 피드백은 토스트.
// raw 에러 비노출(친화 고정 메시지). role 쓰기 경로 없음.
import { useMemo, useState } from 'react';
import { createBrowserSupabase } from '@/core/supabase/client';
import { useToast } from '@/app/_toast/ToastProvider';
import { AccountForm, type AccountBusy } from './AccountForm';
import { setNameAction, setPhoneAction } from './actions';

export function AccountClient({ initialName, initialPhone }: { initialName: string; initialPhone: string }) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const toast = useToast();

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState<AccountBusy>(null);

  async function onSaveName() {
    if (busy || !name.trim()) return;
    setBusy('name');
    const res = await setNameAction(name.trim());
    setBusy(null);
    if (res.ok) toast.success('이름을 저장했어요.');
    else toast.error('이름 저장에 실패했어요.');
  }

  async function onSavePhone() {
    if (busy) return;
    setBusy('phone');
    const res = await setPhoneAction(phone.trim());
    setBusy(null);
    if (res.ok) toast.success('전화번호를 저장했어요.');
    else toast.error('전화번호 저장에 실패했어요.');
  }

  async function onSavePassword() {
    if (busy) return;
    if (pw1.length < 6) {
      toast.error('비밀번호는 6자 이상이어야 해요.');
      return;
    }
    if (pw1 !== pw2) {
      toast.error('두 비밀번호가 일치하지 않아요.');
      return;
    }
    setBusy('pw');
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setBusy(null);
    if (error) {
      toast.error('비밀번호를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.');
      return;
    }
    setPw1('');
    setPw2('');
    toast.success('비밀번호를 바꿨어요.');
  }

  return (
    <AccountForm
      name={name}
      phone={phone}
      pw1={pw1}
      pw2={pw2}
      busy={busy}
      onName={setName}
      onPhone={setPhone}
      onPw1={setPw1}
      onPw2={setPw2}
      onSaveName={onSaveName}
      onSavePhone={onSavePhone}
      onSavePassword={onSavePassword}
    />
  );
}
