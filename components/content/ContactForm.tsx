'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PrimaryButton, TextAreaField, TextField } from '@/components/ui/Field';
import { useModal } from '@/components/ui/ModalProvider';
import { contactSchema, validate, type FieldErrors } from '@/lib/forms';

/**
 * Contact page form. Demo build: the fields are validated locally (zod, same
 * rules as the member forms) and a dialog says nothing was sent — no request
 * leaves the page.
 */
const EMPTY = { name: '', email: '', subject: '', message: '' };

export function ContactForm() {
  const t = useTranslations('content');
  const tc = useTranslations('common');
  const modal = useModal();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});

  function update(field: keyof typeof EMPTY, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validate(contactSchema, values);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    modal.success(t('contact.form.demoTitle'), t('contact.form.demoBody'));
  }

  return (
    <form onSubmit={onSubmit} noValidate data-contact-form className="space-y-4">
      <div className="grid gap-4 desktop:grid-cols-2">
        <TextField
          id="contact-name"
          label={t('contact.form.name')}
          autoComplete="name"
          value={values.name}
          error={errors.name ? tc(errors.name) : undefined}
          onChange={(event) => update('name', event.target.value)}
        />
        <TextField
          id="contact-email"
          label={t('contact.form.email')}
          type="email"
          autoComplete="email"
          value={values.email}
          error={errors.email ? tc(errors.email) : undefined}
          onChange={(event) => update('email', event.target.value)}
        />
      </div>
      <TextField
        id="contact-subject"
        label={t('contact.form.subject')}
        value={values.subject}
        error={errors.subject ? tc(errors.subject) : undefined}
        onChange={(event) => update('subject', event.target.value)}
      />
      <TextAreaField
        id="contact-message"
        label={t('contact.form.message')}
        value={values.message}
        error={errors.message ? tc(errors.message) : undefined}
        onChange={(event) => update('message', event.target.value)}
      />
      <PrimaryButton>{t('contact.form.submit')}</PrimaryButton>
    </form>
  );
}
