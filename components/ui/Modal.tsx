'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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

/** Icon and tint per variant; the eyebrow label is `common.modal.<variant>`. */
const VARIANT_STYLE: Record<ModalVariant, { icon: IconName; tint: string }> = {
  success: { icon: 'success', tint: 'text-[var(--color-success)]' },
  error: { icon: 'alert', tint: 'text-[var(--color-danger)]' },
  alert: { icon: 'alert', tint: 'text-accent' },
  status: { icon: 'info', tint: 'text-accent' },
  message: { icon: 'chat', tint: 'text-muted' },
  loading: { icon: 'spinner', tint: 'text-accent' },
  rules: { icon: 'news', tint: 'text-muted' },
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
  /**
   * Renders the overlay on `document.body` instead of in place. A dialog opened
   * from inside a transformed container (the mobile drawer slides with a
   * transform) would otherwise lay out inside that container: `position: fixed`
   * resolves against the nearest transformed ancestor, so the overlay would be
   * drawer-sized rather than viewport-sized.
   */
  portal?: boolean;
};

export function Modal({
  open,
  onClose,
  variant = 'message',
  title,
  children,
  actions,
  dismissible,
  portal = false,
}: ModalProps) {
  const t = useTranslations('common');
  const panelRef = useRef<HTMLDivElement>(null);
  const style = VARIANT_STYLE[variant];
  const canDismiss = dismissible ?? variant !== 'loading';
  /**
   * `onClose` is a fresh closure on every parent render, so taking it as an
   * effect dependency re-ran the whole block on each keystroke in the dialogs
   * with a form (the voucher code one) — and its focus step pulled focus out of
   * the input after the first character. Keep the latest callback in a ref
   * instead: the effect then runs once per open.
   */
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    // Focus stays inside the dialog while it is open (T27), and goes back to
    // whatever had it before the dialog opened — the button that opened it.
    const restoreTo = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((node) => node.offsetParent !== null);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && canDismiss) closeRef.current();
      if (event.key !== 'Tab') return;

      const nodes = focusable();
      if (nodes.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = active === panelRef.current || (active && panelRef.current?.contains(active));

      if (!inside) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      // The opener keeps focus after the dialog closes, as it should.
      if (restoreTo && document.contains(restoreTo)) restoreTo.focus();
    };
  }, [open, canDismiss]);

  if (!open) return null;

  const overlay = (
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
        className="bg-panel border-line flex max-h-[85vh] w-full max-w-md flex-col rounded-[var(--radius-panel)] border shadow-2xl shadow-black/50 outline-none"
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
            <p className="text-muted text-11 tracking-widest uppercase">{t(`modal.${variant}`)}</p>
            <h2 className="text-ink mt-1 text-base font-semibold">{title}</h2>
            {children ? (
              /* The taller dialogs (voucher + its code list) scroll as a whole:
                 a fixed 45vh cap left the last block clipped mid-line. */
              <div className="text-muted mt-2 min-h-0 overflow-y-auto pb-1 text-sm leading-relaxed whitespace-pre-line">
                {children}
              </div>
            ) : null}
          </div>

          {canDismiss ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={t('modal.closeDialog')}
              className="text-muted hover:text-ink -mt-1 -mr-2 grid size-11 shrink-0 place-items-center"
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

  if (portal) {
    // The dialog only exists after a click, so this never runs during SSR.
    return typeof document === 'undefined' ? null : createPortal(overlay, document.body);
  }
  return overlay;
}
