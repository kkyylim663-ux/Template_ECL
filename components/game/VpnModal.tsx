'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import type { VpnDemo } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';

/**
 * The VPN-download dialog (`#rulesModal-vpn-download`): the shared `.modal`
 * shell — 550px, #171717, 15px radius — with the deposit-first header rule and
 * the `.vpn-download__*` content: an explanation, the demo credentials in
 * mustard and the download link in green. The panel scales in like every modal
 * in the reference build (`all .3s`); Escape, the close icon and a backdrop
 * click dismiss it, and focus is trapped while it is open (T27's contract).
 */
export function VpnModal({ demo, onClose }: { demo: VpnDemo; onClose: () => void }) {
  const t = useTranslations('games');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    panel.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      // Focus trap: cycle inside the panel (T27's dialog contract).
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="presentation"
      className="vpn-backdrop p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={t('vpn.title')} tabIndex={-1} className="vpn-modal outline-none">
        <div className="vpn-modal__header">
          <h3 className="vpn-modal__title">{t('vpn.title')}</h3>
          <button type="button" onClick={onClose} aria-label={t('vpn.close')} className="vpn-modal__close">
            <Icon name="close" size={24} />
          </button>
        </div>
        <div className="vpn-modal__body">
          <div className="vpn-modal__center">
            <p className="vpn-download__header text-sm leading-[normal]">{t('vpn.header')}</p>
            <p className="vpn-download__id text-sm leading-[normal]">{t('vpn.loginId', { id: demo.loginId })}</p>
            <p className="vpn-download__id text-sm leading-[normal]">{t('vpn.password', { password: demo.password })}</p>
            <a href={demo.link} target="_blank" rel="noreferrer" className="vpn-download__link text-sm leading-[normal]">
              {demo.link}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
