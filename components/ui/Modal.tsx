'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/**
 * The seven modal variants the reference build shows
 * (success / error / alert / status / message / loading / rules). One panel
 * template, one behaviour: close on the X, on the overlay, or on Escape.
 */
export const MODAL_VARIANTS = [
  'success',
  'error',
  'alert',
  'status',
  'message',
  'loading',
  'rules',
] as const;

export type ModalVariant = (typeof MODAL_VARIANTS)[number];

const VARIANT_STYLE: Record<ModalVariant, { icon: IconName; tint: string; label: string }> = {
  success: { icon: 'success', tint: 'text-[var(--color-success)]', label: 'Success' },
  error: { icon: 'alert', tint: 'text-[var(--color-danger)]', label: 'Error' },
  alert: { icon: 'alert', tint: 'text-accent', label: 'Alert' },
  status: { icon: 'info', tint: 'text-accent', label: 'Status' },
  message: { icon: 'chat', tint: 'text-muted', label: 'Message' },
  loading: { icon: 'spinner', tint: 'text-accent', label: 'Loading' },
  rules: { icon: 'news', tint: 'text-muted', label: 'Rules' },
};

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  variant?: ModalVariant;
  title: string;
  children?: ReactNode;
  /** Action row; omitted for `loading`, which has nothing to decide. */
  actions?: ReactNode;
  /** Loading has no close affordance by design. */
  dismissible?: boolean;
};

export function Modal({
  open,
  onClose,
  variant = 'message',
  title,
  children,
  actions,
  dismissible,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const style = VARIANT_STYLE[variant];
  const canDismiss = dismissible ?? variant !== 'loading';

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && canDismiss) onClose();
    }
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, canDismiss, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && canDismiss) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        data-variant={variant}
        className="bg-panel border-line w-full max-w-md rounded-[var(--radius-panel)] border shadow-2xl shadow-black/50 outline-none"
      >
        <div className="flex items-start gap-3 p-5">
          <span className={`mt-0.5 shrink-0 ${style.tint}`}>
            <Icon
              name={style.icon}
              size={24}
              className={variant === 'loading' ? 'animate-spin' : undefined}
            />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-muted text-[11px] tracking-widest uppercase">{style.label}</p>
            <h2 className="text-ink mt-1 text-base font-semibold">{title}</h2>
            {children ? (
              <div className="text-muted mt-2 max-h-[45vh] overflow-y-auto text-sm leading-relaxed">
                {children}
              </div>
            ) : null}
          </div>

          {canDismiss ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="text-muted hover:text-ink -mt-1 -mr-1 grid size-8 shrink-0 place-items-center"
            >
              <Icon name="close" size={18} />
            </button>
          ) : null}
        </div>

        {actions ? (
          <div className="border-line flex justify-end gap-2 border-t px-5 py-3">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
