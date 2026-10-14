'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

type ToastKind = 'info' | 'success' | 'error';

type Toast = { id: number; kind: ToastKind; text: string };

type ToastApi = {
  show: (text: string, kind?: ToastKind) => void;
  success: (text: string) => void;
  error: (text: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const TONE: Record<ToastKind, { icon: 'info' | 'success' | 'alert'; tint: string }> = {
  info: { icon: 'info', tint: 'text-accent' },
  success: { icon: 'success', tint: 'text-[var(--color-success)]' },
  error: { icon: 'alert', tint: 'text-[var(--color-danger)]' },
};

/** Transient messages. Auto-dismiss, so nothing needs a close button. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((text: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, kind, text }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (text) => show(text, 'success'),
      error: (text) => show(text, 'error'),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 desktop:bottom-6 desktop:items-end"
      >
        {toasts.map((toast) => (
          <p
            key={toast.id}
            className="bg-panel-alt border-line text-ink flex items-center gap-2 rounded-[var(--radius-tag)] border px-3 py-2 text-sm shadow-lg shadow-black/40"
          >
            <Icon name={TONE[toast.kind].icon} size={18} className={TONE[toast.kind].tint} />
            {toast.text}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return context;
}
