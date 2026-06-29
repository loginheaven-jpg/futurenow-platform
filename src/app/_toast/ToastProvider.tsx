'use client';
// 전역 토스트 프로바이더 — 작업 결과(성공/실패/정보)를 사용자에게 분명히 전달. layout 에 클라이언트 래퍼로 주입.
// 접근성: 컨테이너 role="status" aria-live="polite". 자동 dismiss(5s) + 수동 닫기. id 는 ref 카운터(랜덤·시간 비의존).
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastItem, type ToastKind } from './ToastItem';

interface ToastEntry {
  id: number;
  kind: ToastKind;
  message: string;
}
interface ToastApi {
  show: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast 는 ToastProvider 안에서만 사용할 수 있어요.');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const show = useCallback(
    (kind: ToastKind, message: string) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((ts) => [...ts, { id, kind, message }]);
      setTimeout(() => dismiss(id), 5000); // 자동 dismiss
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m) => show('success', m),
      error: (m) => show('error', m),
      info: (m) => show('info', m),
    }),
    [show],
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: '0 var(--space-4)',
          pointerEvents: 'none', // 빈 컨테이너가 클릭을 막지 않게
          zIndex: 50,
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem kind={t.kind} message={t.message} onClose={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
