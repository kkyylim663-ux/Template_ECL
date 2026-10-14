'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { PrimaryButton } from '@/components/ui/Field';
import { readDemoSessionFromDocument } from '@/lib/session';

/**
 * The site-wide Voucher (Promo Code) dialog, as on the reference build: an entry
 * in the header and one in the mobile drawer, both opening the same panel.
 *
 * A guest is asked to sign in; a signed-in visitor gets a demo result. Nothing is
 * ever sent anywhere — the live build posts the code to the voucher endpoint.
 */
export function VoucherEntry({
  region,
  variant,
}: {
  region: string;
  variant: 'header' | 'drawer';
}) {
  // Shell furniture: the dialog lives in the header and the drawer, so its
  // copy rides with `common` — the one namespace every page already has.
  const t = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [result, setResult] = useState<'guest' | 'demo' | 'empty' | null>(null);

  function close() {
    setOpen(false);
    setResult(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (code.trim().length === 0) {
      setResult('empty');
      return;
    }
    setResult(readDemoSessionFromDocument() ? 'demo' : 'guest');
  }

  const trigger =
    variant === 'header' ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-voucher="header"
        className="border-line text-ink hover:border-accent hover:text-accent rounded-[8px] border px-3 py-2 text-xs font-medium"
      >
        {t('voucher.title')}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-voucher="drawer"
        className="border-line text-ink/90 flex w-full items-center gap-4 rounded-[8px] border px-3 py-2.5 text-left text-xs"
      >
        <span className="text-accent shrink-0">◆</span>
        {t('voucher.title')}
      </button>
    );

  return (
    <>
      {trigger}

      <Modal open={open} onClose={close} variant="message" title={t('voucher.title')}>
        <form onSubmit={submit} noValidate className="space-y-3" data-voucher-form>
          <p>{t('voucher.hint')}</p>

          <label htmlFor="voucher-code" className="text-muted block text-xs font-medium">
            {t('voucher.codeLabel')}
          </label>
          <input
            id="voucher-code"
            name="code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setResult(null);
            }}
            placeholder={t('voucher.placeholder')}
            className="border-line bg-panel text-ink placeholder:text-muted focus:border-accent w-full rounded-[var(--radius-tag)] border px-3 py-2 font-mono text-sm outline-none"
          />

          {result === 'empty' ? (
            <p role="alert" className="text-[var(--color-danger)] text-xs">
              {t('voucher.emptyCode')}
            </p>
          ) : null}

          {result === 'guest' ? (
            <p role="status" className="border-accent text-accent rounded-[var(--radius-tag)] border px-3 py-2 text-xs">
              {t('voucher.guestNotice')}{' '}
              <Link href={`/${region}/login`} className="underline">
                {t('voucher.guestAction')}
              </Link>
            </p>
          ) : null}

          {result === 'demo' ? (
            <p role="status" className="text-[var(--color-success)] text-xs">
              {t('voucher.demoNotice', { code: code.trim() })}
            </p>
          ) : null}

          <PrimaryButton type="submit" className="w-full">
            {t('action.submit')}
          </PrimaryButton>
        </form>
      </Modal>
    </>
  );
}
