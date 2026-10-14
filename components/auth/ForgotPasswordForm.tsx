'use client';

import { useState } from 'react';
import { FormNotice, PrimaryButton, TextField } from '@/components/ui/Field';
import { forgotPasswordSchema, validate, type FieldErrors } from '@/lib/forms';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sent, setSent] = useState(false);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validate(forgotPasswordSchema, { email });

    if (!result.ok) {
      setErrors(result.errors);
      setSent(false);
      return;
    }

    setErrors({});
    setSent(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <TextField
        id="email"
        label="Email address"
        type="email"
        autoComplete="email"
        value={email}
        error={errors.email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <PrimaryButton type="submit" className="w-full">
        Send reset link
      </PrimaryButton>

      {sent ? (
        <p className="text-sm text-[var(--color-success)]">
          If {email} is registered, a reset link is on its way. Demo build: no email is sent.
        </p>
      ) : null}

      <FormNotice>Demo build: nothing is sent and no endpoint is called.</FormNotice>
    </form>
  );
}
