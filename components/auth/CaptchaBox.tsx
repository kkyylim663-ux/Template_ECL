'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

/** Fixed codes so server and client render the same first frame; no image is requested. */
const CODES = ['K7PQ', '9XMF', 'T3HN', 'Q6BW'] as const;

/** Captcha placeholder: a local code that changes on click. Not checked on submit. */
export function CaptchaBox() {
  const t = useTranslations('auth');
  const [index, setIndex] = useState(0);

  return (
    <div className="flex items-center gap-3">
      <input
        className="form-control flex-1"
        autoComplete="off"
        aria-label={t('login.captcha')}
        placeholder={t('login.captcha')}
      />
      {/* T76: the code itself is the visible text, so the name has to carry it. */}
      <button
        type="button"
        className="shrink-0 rounded-[8px] bg-[var(--color-tile-soft)] px-3 py-2 font-bold tracking-[0.2em]"
        aria-label={`${t('login.captchaRefresh')} ${CODES[index]}`}
        title={t('login.captchaRefresh')}
        onClick={() => setIndex((current) => (current + 1) % CODES.length)}
      >
        {CODES[index]}
      </button>
    </div>
  );
}
