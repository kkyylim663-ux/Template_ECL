'use client';

import { useTranslations } from 'next-intl';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Modal, type ModalVariant } from './Modal';

type ModalRequest = {
  variant: ModalVariant;
  title: string;
  body?: string;
  image?: { desktop: string; mobile: string };
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
};

type ModalApi = {
  /** Shows a variant without expecting a decision (success / error / status …). */
  show: (request: ModalRequest) => void;
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
  alert: (title: string, body?: string) => void;
  status: (title: string, body?: string) => void;
  message: (title: string, body?: string) => void;
  rules: (title: string, body?: string, image?: { desktop: string; mobile: string }) => void;
  /** Stays open until `close()`; the caller decides when work finished. */
  loading: (title?: string) => void;
  close: () => void;
  /** Confirmation with a callback — the shape used before destructive actions. */
  confirm: (
    title: string,
    body: string,
    onConfirm: () => void,
    confirmLabel?: string,
    cancelLabel?: string,
  ) => void;
};

const ModalContext = createContext<ModalApi | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const t = useTranslations('common');
  const [request, setRequest] = useState<ModalRequest | null>(null);
  const [open, setOpen] = useState(false);

  const show = useCallback((next: ModalRequest) => {
    setRequest(next);
    setOpen(true);
  }, []);

  const api = useMemo<ModalApi>(
    () => ({
      show,
      close: () => setOpen(false),
      success: (title, body) => show({ variant: 'success', title, body }),
      error: (title, body) => show({ variant: 'error', title, body }),
      alert: (title, body) => show({ variant: 'alert', title, body }),
      status: (title, body) => show({ variant: 'status', title, body }),
      message: (title, body) => show({ variant: 'message', title, body }),
      rules: (title, body, image) => show({ variant: 'rules', title, body, image }),
      loading: (title = t('modal.working')) => show({ variant: 'loading', title }),
      confirm: (title, body, onConfirm, confirmLabel = t('action.confirm'), cancelLabel) =>
        show({ variant: 'alert', title, body, onConfirm, confirmLabel, cancelLabel }),
    }),
    [show, t],
  );

  return (
    <ModalContext.Provider value={api}>
      {children}
      <Modal
        open={open}
        onClose={api.close}
        variant={request?.variant ?? 'message'}
        title={request?.title ?? ''}
        actions={
          request && request.variant !== 'loading' ? (
            <>
              {request.onConfirm ? (
                <button
                  type="button"
                  onClick={() => {
                    api.close();
                  }}
                  className="border-line text-ink hover:border-accent rounded-[8px] border px-4 py-2 text-sm"
                >
                  {request.cancelLabel ?? t('action.cancel')}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  const action = request.onConfirm;
                  api.close();
                  action?.();
                }}
                className="bg-accent rounded-[8px] px-4 py-2 text-sm font-semibold text-[#1b1b1b]"
              >
                {request.confirmLabel ?? t('modal.ok')}
              </button>
            </>
          ) : null
        }
      >
        {request?.image ? (
          <picture>
            <source media="(max-width: 768px)" srcSet={request.image.mobile} />
            <img
              src={request.image.desktop}
              alt=""
              className="w-full rounded-[var(--radius-panel)]"
            />
          </picture>
        ) : request?.body ? (
          <p>{request.body}</p>
        ) : null}
      </Modal>
    </ModalContext.Provider>
  );
}

export function useModal(): ModalApi {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used inside <ModalProvider>');
  }
  return context;
}
