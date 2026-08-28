'use client';

// 계좌 복사(발주서 §3.4) — "모바일에서 숫자를 손으로 옮겨 적게 두면 이탈한다".
//
// 클립보드는 두 단계로 시도한다. navigator.clipboard 는 **보안 컨텍스트(HTTPS)에서만** 살아 있고
//   카톡·인스타 인앱 브라우저에서 막히는 사례가 있다. 그때 조용히 아무 일도 안 일어나면
//   사용자는 버튼이 고장 났다고 읽는다 — 그래서 실패를 감추지 않고 "길게 눌러 선택하시라"고 알린다.
//   경고색은 쓰지 않는다(발주서 §3.4).
//
// 복사값은 은행명·예금주를 뺀 번호만이다(intake.accountNumber). 붙여넣는 곳이 이체 화면이라
//   "우리은행 …(예금주 이승은)" 통째로 들어가면 그 화면에서 다시 지워야 한다.
import { useToast } from '@/app/_toast/ToastProvider';
import { FEE } from './copy';

export function AccountCopy({ value }: { value: string }) {
  const toast = useToast();

  async function onCopy() {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(value);
      toast.success(FEE.copied);
    } catch {
      toast.info(FEE.copyFailed);
    }
  }

  return (
    <button type="button" className="rc-copy" onClick={onCopy}>
      {FEE.copyLabel}
    </button>
  );
}
