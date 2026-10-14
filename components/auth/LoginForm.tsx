'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormNotice, PrimaryButton, TextField } from '@/components/ui/Field';
import { useModal } from '@/components/ui/ModalProvider';
import { Tabs } from '@/components/ui/Tabs';
import {
  loginEmailSchema,
  loginOtpSchema,
  loginUsernameSchema,
  validate,
  type FieldErrors,
} from '@/lib/forms';
import { DEMO_SESSION_COOKIE, DEMO_SESSION_VALUE } from '@/lib/session';

type Method = 'username' | 'email' | 'otp';

const TABS = [
  { id: 'username', label: 'Username' },
  { id: 'email', label: 'Email' },
  { id: 'otp', label: 'Mobile + OTP' },
];

const SCHEMAS = {
  username: loginUsernameSchema,
  email: loginEmailSchema,
  otp: loginOtpSchema,
};

/**
 * Sign-in form with the three methods the reference build offers. P0 is a
 * placeholder: the values are validated locally and then a demo session cookie is
 * set so the guarded member area can be browsed. No request leaves the page, and
 * the dialog says so.
 */
export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const modal = useModal();
  const [method, setMethod] = useState<Method>('username');
  const [values, setValues] = useState({ identifier: '', password: '', otp: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [otpSent, setOtpSent] = useState(false);

  function update(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validate(SCHEMAS[method], values);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    // Demo session only: the real build receives an httpOnly cookie from the API.
    document.cookie = `${DEMO_SESSION_COOKIE}=${DEMO_SESSION_VALUE}; path=/; max-age=86400; samesite=lax`;
    modal.success(
      'Demo sign-in',
      'No account was checked and no request was sent. A demo session cookie was set so you can browse the member area. Use the same dialog to sign out by clearing cookies.',
    );
    router.refresh();
    if (next) router.push(next);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Tabs tabs={TABS} value={method} onChange={(id) => setMethod(id as Method)} label="Sign-in method" />

      {method === 'otp' ? (
        <>
          <TextField
            id="identifier"
            label="Mobile number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+60 12-345 6789"
            value={values.identifier}
            error={errors.identifier}
            onChange={(event) => update('identifier', event.target.value)}
          />
          <TextField
            id="otp"
            label="6-digit code"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={values.otp}
            error={errors.otp}
            hint={otpSent ? `Code sent to ${values.identifier} (demo: any 6 digits work)` : undefined}
            onChange={(event) => update('otp', event.target.value)}
          />
          <button
            type="button"
            onClick={() => setOtpSent(true)}
            className="border-line text-ink hover:border-accent rounded-[8px] border px-3 py-1.5 text-xs"
          >
            Send code
          </button>
        </>
      ) : (
        <>
          <TextField
            id="identifier"
            label={method === 'email' ? 'Email address' : 'Username'}
            type={method === 'email' ? 'email' : 'text'}
            autoComplete="username"
            value={values.identifier}
            error={errors.identifier}
            onChange={(event) => update('identifier', event.target.value)}
          />
          <TextField
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            error={errors.password}
            onChange={(event) => update('password', event.target.value)}
          />
        </>
      )}

      <PrimaryButton type="submit" className="w-full">
        Sign in
      </PrimaryButton>

      <FormNotice>
        Demo build: nothing is submitted. Submitting sets a demo cookie so the member area can be
        opened.
      </FormNotice>
    </form>
  );
}
