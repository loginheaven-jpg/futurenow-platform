'use client';
// 계정 수정 오케스트레이션 — 이름·전화·프로필(서버액션) + 비번(클라이언트 supabase.auth.updateUser) + (코치)KPC. 피드백은 토스트.
// raw 에러 비노출(친화 고정 메시지). role 쓰기 경로 없음. 파싱·검증(생년·신앙연수·KPC 형식)은 여기서, 폼은 프레젠테이션만.
import { useMemo, useState } from 'react';
import type { UserProfile } from '@/contracts';
import { CURRENT_YEAR, KPC_RE } from '@/instruments/futurenow/profileVocab';
import { createBrowserSupabase } from '@/core/supabase/client';
import { useToast } from '@/app/_toast/ToastProvider';
import { AccountForm, type AccountBusy } from './AccountForm';
import { setContactAction, setKpcAction, setNameAction, setProfileAction } from './actions';

export function AccountClient({
  initialName,
  initialPhone,
  initialAddress,
  initialBankAccount,
  initialProfile,
  initialKpc,
  allowKpc,
}: {
  initialName: string;
  initialPhone: string;
  initialAddress: string;
  initialBankAccount: string;
  initialProfile: UserProfile | null;
  initialKpc: string;
  allowKpc: boolean; // role==='coach' — KPC 섹션 노출·저장 허용
}) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const toast = useToast();

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState(initialAddress);
  const [bankAccount, setBankAccount] = useState(initialBankAccount);
  const [gender, setGender] = useState(initialProfile?.gender ?? '');
  const [birthYear, setBirthYear] = useState(initialProfile?.birthYear != null ? String(initialProfile.birthYear) : '');
  const [religion, setReligion] = useState(initialProfile?.religion ?? '');
  const [faithYears, setFaithYears] = useState(initialProfile?.faithYears != null ? String(initialProfile.faithYears) : '');
  const [kpc, setKpc] = useState(initialKpc);
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

  async function onSaveContact() {
    if (busy) return;
    setBusy('phone');
    const res = await setContactAction({ phone, address, bankAccount });
    setBusy(null);
    if (res.ok) toast.success('연락처를 저장했어요.');
    else toast.error('연락처 저장에 실패했어요.');
  }

  async function onSaveProfile() {
    if (busy) return;
    // 전부 선택(nullable) — 비우면 null. 입력 시에만 형식 검증(생년 4자리·1900..현재연도, 신앙연수 0 이상 정수).
    const by = birthYear.trim();
    let birthNum: number | null = null;
    if (by !== '') {
      const n = Number(by);
      if (!/^\d{4}$/.test(by) || n < 1900 || n > CURRENT_YEAR) {
        toast.error('태어난 해를 올바르게 입력해 주세요.');
        return;
      }
      birthNum = n;
    }
    const fyStr = faithYears.trim();
    let faithNum: number | null = null;
    if (fyStr !== '') {
      const n = Number(fyStr);
      if (!Number.isFinite(n) || n < 0) {
        toast.error('신앙 연수를 올바르게 입력해 주세요.');
        return;
      }
      faithNum = Math.floor(n);
    }
    setBusy('profile');
    const res = await setProfileAction({
      gender: gender || null,
      birthYear: birthNum,
      religion: religion || null,
      faithYears: faithNum,
    });
    setBusy(null);
    if (res.ok) toast.success('프로필을 저장했어요.');
    else toast.error('프로필 저장에 실패했어요.');
  }

  async function onSaveKpc() {
    if (busy) return;
    const v = kpc.trim();
    if (!KPC_RE.test(v)) {
      toast.error('KPC 형식이 올바르지 않아요. (예: KPC12345)');
      return;
    }
    setBusy('kpc');
    const res = await setKpcAction(v);
    setBusy(null);
    if (res.ok) toast.success('KPC 인증번호를 저장했어요.');
    else toast.error('KPC 저장에 실패했어요.');
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
      address={address}
      bankAccount={bankAccount}
      pw1={pw1}
      pw2={pw2}
      busy={busy}
      profile={{
        gender,
        birthYear,
        religion,
        faithYears,
        onGender: setGender,
        onBirthYear: setBirthYear,
        onReligion: setReligion,
        onFaithYears: setFaithYears,
        onSave: onSaveProfile,
      }}
      coachKpc={allowKpc ? { kpc, onKpc: setKpc, onSave: onSaveKpc } : undefined}
      onName={setName}
      onPhone={setPhone}
      onAddress={setAddress}
      onBankAccount={setBankAccount}
      onPw1={setPw1}
      onPw2={setPw2}
      onSaveName={onSaveName}
      onSaveContact={onSaveContact}
      onSavePassword={onSavePassword}
    />
  );
}
