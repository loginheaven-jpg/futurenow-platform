'use client';
// 인도자 로그인 오케스트레이션 — supabase.auth.signInWithPassword → 역할별 리다이렉트.
// 로그인 전용(가입은 /join). 비밀번호·토큰을 로그·URL에 싣지 않는다. 폼은 LoginForm(프레젠테이션).
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/core/supabase/client';
import { LoginForm } from './LoginForm';
import { loginOutcome, LOGIN_HOME } from './loginOutcome';
import { loginLandingAction } from './landingAction';

export function LoginClient({ returnTo = null }: { returnTo?: string | null }) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!email || !password || busy) return;
    setBusy(true);
    setError(null);
    // 로그인은 앱의 현관이다 — 여기서 버튼이 잠기면 아무 데도 못 간다.
    //   성공 시에는 busy 를 풀지 않는다: 이동이 도는 동안 버튼이 살아나면 이중 로그인이 눌린다.
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      const outcome = loginOutcome({ error: res.error, hasSession: !!res.data.session, returnTo });
      if (outcome.error) {
        setError(outcome.error); // 원시 에러(자격 정보 누출 가능)는 싣지 않는다
        setBusy(false);
        return;
      }
      // **소건 1-나 — push 가 아니라 replace 다.**
      //   push 면 `/login` 이 히스토리에 남아, 뒤로가기 두 번이면 로그인 폼으로 되돌아간다.
      //   세션은 살아 있는데 폼이 보이니 **로그아웃으로 읽힌다**(4차 F-5 B행 증상).
      //   1-가(서버 리다이렉트)와 짝이다 — 가는 닿았을 때 되돌려 보내고, 나는 애초에 닿지 않게 한다.
      //   둘 다 두는 이유: 뒤로가기 말고도 `/login` 을 북마크·링크로 여는 길이 있다.
      if (outcome.redirect) {
        // ★ **거점이 하나뿐이면 홈을 거치지 않는다**(ADR-173 · 지시 case 1·2).
        //   `returnTo` 로 정해진 목적지는 **그대로 이긴다** — 물어보지도 않는다(지휘부 확정).
        //   홈으로 갈 때만 서버에 착지를 묻고 **한 번만** 이동한다.
        //   전에는 `/home` 에서 서버 `redirect()` 를 했는데 `loading.tsx` 와 겹쳐 화면이 멈췄다.
        const to = outcome.redirect === LOGIN_HOME
          ? await loginLandingAction().catch(() => LOGIN_HOME)
          : outcome.redirect;
        router.replace(to);
      }
      else setBusy(false);
    } catch {
      // 예외(네트워크 끊김 등) — **버튼 잠김만 푼다.**
      //   async 이벤트 핸들러의 예외는 에러 경계로 가지 않고 unhandled rejection 이 되므로,
      //   catch 가 없으면 busy 가 true 로 남아 현관에서 아무 데도 못 간다.
      //   문구는 새로 만들지 않는다(§2-1). 기존 `이메일 또는 비밀번호를 확인해 주세요` 는
      //   네트워크 오류에 **틀린 안내**라 쓰지 않는다 — 문안 신설 여부는 지휘부 질의로 올린다.
      setBusy(false);
    }
  }

  return (
    <LoginForm
      email={email}
      password={password}
      show={show}
      busy={busy}
      error={error}
      onEmail={setEmail}
      onPassword={setPassword}
      onToggleShow={() => setShow((s) => !s)}
      onSubmit={onSubmit}
    />
  );
}
