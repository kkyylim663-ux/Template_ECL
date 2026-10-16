'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { brand } from '@/config/brand';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import {
  RECEIPT_ACCEPT,
  formatBytes,
  mockUploadReceipt,
  receiptExtension,
  receiptRejection,
} from '@/lib/upload';

/**
 * T53: the receipt step the reference swaps in once a bank deposit is submitted
 * (`#rec-upload-tpl` — `Transaction ID : <id>`, "Please upload bank deposit
 * slip.", the Attachment field, the UPLOAD / SKIP pair and the `token` / `t`
 * hidden fields). The reference POSTs the form to `uploadv2.php`; this build
 * uploads locally (lib/upload.ts) — no request leaves the page and nothing from
 * the file is stored. `?receiptFail=1` fails the first attempt so the retry path
 * is reachable without a server.
 */
export function DepositReceiptUpload({
  transactionId,
  token,
  ticketid,
  onComplete,
}: {
  transactionId: string;
  token?: string;
  ticketid?: string;
  /** Runs with the mock receipt id, or null when the member skipped. */
  onComplete: (receiptId: string | null) => void;
}) {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const attempts = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // Only images get a thumbnail; the object URL dies with the selection.
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(candidate: File) {
    const rejection = receiptRejection(candidate);
    if (rejection) {
      setFile(null);
      setError(rejection);
      // Empty the field so the same file can be picked again after a fix.
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setError(null);
    setFile(candidate);
  }

  function remove() {
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function upload() {
    if (percent !== null) return;
    if (!file) {
      // The reference's own `err_empty_receipt` for an UPLOAD with no attachment.
      setError('deposit.uploadEmpty');
      return;
    }
    setError(null);
    setPercent(0);
    attempts.current += 1;
    try {
      const receiptId = await mockUploadReceipt(file, {
        onProgress: setPercent,
        attempt: attempts.current,
        failFirst: new URL(window.location.href).searchParams.get('receiptFail') === '1',
      });
      toast.success(t('deposit.uploadOk'));
      onComplete(receiptId);
    } catch {
      setPercent(null);
      setError('deposit.uploadFailed');
    }
  }

  const extension = file ? receiptExtension(file.name) : '';
  const errorText = error
    ? error.startsWith('validation.')
      ? tc(error)
      : t(error)
    : null;

  return (
    <div className="deposit-receipt" data-testid="deposit-receipt">
      <h4 className="deposit-receipt__transid">{t('deposit.transactionId', { id: transactionId })}</h4>
      <h4 className="deposit-receipt__prompt">{t('deposit.uploadTitle')}</h4>
      <p className="deposit-atm-tips">{t('deposit.atmTips', { merchant: brand.name })}</p>

      <h3 className="deposit-receipt__attachment">{t('deposit.attachment')}</h3>
      <div className="deposit-receipt__pick">
        <div
          className={`deposit-receipt__dropzone${file ? ' has-file' : ''}${dragging ? ' is-dragging' : ''}`}
          role="button"
          tabIndex={0}
          aria-label={t('deposit.uploadChoose')}
          data-testid="deposit-dropzone"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const dropped = event.dataTransfer.files[0];
            if (dropped) pick(dropped);
          }}
        >
          {file ? (
            <>
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- a blob: preview of the picked file; next/image cannot load one
                <img className="deposit-receipt__thumb" src={preview} alt="" />
              ) : (
                <span className="deposit-receipt__badge">{extension.toUpperCase()}</span>
              )}
              <span className="deposit-receipt__meta">
                <span className="deposit-receipt__name" data-testid="receipt-name">
                  {file.name}
                </span>
                <span className="deposit-receipt__size">{formatBytes(file.size)}</span>
              </span>
            </>
          ) : (
            <>
              <Icon name="download" size={22} className="deposit-receipt__icon" />
              <span className="deposit-receipt__choose">{t('deposit.uploadChoose')}</span>
              <span className="deposit-receipt__hint">{t('deposit.uploadHint')}</span>
            </>
          )}
        </div>
        {file ? (
          <button
            type="button"
            className="deposit-receipt__remove"
            aria-label={t('deposit.removeFile')}
            onClick={remove}
          >
            <Icon name="close" size={16} />
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        name="receipt"
        accept={RECEIPT_ACCEPT}
        className="deposit-receipt__input"
        onChange={(event) => {
          const picked = event.target.files?.[0];
          if (picked) pick(picked);
        }}
      />

      {percent !== null ? (
        <div
          className="deposit-receipt__progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={t('deposit.uploading', { percent })}
          data-testid="receipt-progress"
        >
          <span className="deposit-receipt__progress-fill" style={{ width: `${percent}%` }} />
        </div>
      ) : null}
      {percent !== null ? (
        <p className="deposit-receipt__status">{t('deposit.uploading', { percent })}</p>
      ) : null}
      {errorText ? (
        <p role="alert" className="deposit-error">
          {errorText}
        </p>
      ) : null}

      <div className="deposit-receipt__actions">
        <button
          type="button"
          className="deposit-receipt__btn deposit-receipt__btn--upload"
          onClick={() => void upload()}
          disabled={percent !== null}
        >
          {error === 'deposit.uploadFailed' ? tc('action.retry') : t('deposit.uploadButton')}
        </button>
        <button
          type="button"
          className="deposit-receipt__btn"
          onClick={() => onComplete(null)}
          disabled={percent !== null}
        >
          {t('deposit.skipButton')}
        </button>
      </div>

      {/* The reference form's hidden fields (${d.token} / ${d.ticketid}). */}
      {token ? <input type="hidden" name="token" value={token} /> : null}
      {ticketid ? <input type="hidden" name="t" value={ticketid} /> : null}
    </div>
  );
}
