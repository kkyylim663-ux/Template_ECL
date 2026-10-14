'use client';

import { useState } from 'react';
import { FormNotice, PrimaryButton, TextField } from '@/components/ui/Field';
import { useModal } from '@/components/ui/ModalProvider';
import { registerSchema, validate, type FieldErrors } from '@/lib/forms';

const EMPTY = {
  email: '',
  emailOtp: '',
  username: '',
  password: '',
  password2: '',
  fullName: '',
  nickname: '',
  mobile: '',
  upline: '',
  acceptedTerms: false,
};

/** Registration form: full field set, zod validation, no request of any kind. */
export function RegisterForm() {
  const modal = useModal();
  const [values, setValues] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [codeSent, setCodeSent] = useState(false);

  function update<K extends keyof typeof EMPTY>(field: K, value: (typeof EMPTY)[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validate(registerSchema, values);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    modal.success(
      'Demo registration',
      'The form validated, but no account was created and no request was sent — this build has no auth service. In the live build this step calls register, then multiLogin.',
    );
    setValues({ ...EMPTY });
    setCodeSent(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 desktop:grid-cols-2">
        <TextField
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          value={values.email}
          error={errors.email}
          onChange={(event) => update('email', event.target.value)}
        />
        <div>
          <TextField
            id="emailOtp"
            label="Email code"
            inputMode="numeric"
            maxLength={6}
            value={values.emailOtp}
            error={errors.emailOtp}
            hint={codeSent ? 'Demo: any 6 digits are accepted' : undefined}
            onChange={(event) => update('emailOtp', event.target.value)}
          />
          <button
            type="button"
            onClick={() => setCodeSent(true)}
            className="border-line text-ink hover:border-accent mt-2 rounded-[8px] border px-3 py-1.5 text-xs"
          >
            Send code
          </button>
        </div>

        <TextField
          id="username"
          label="Username"
          autoComplete="username"
          value={values.username}
          error={errors.username}
          hint="4-20 letters or digits"
          onChange={(event) => update('username', event.target.value)}
        />
        <TextField
          id="mobile"
          label="Mobile number"
          type="tel"
          inputMode="tel"
          value={values.mobile}
          error={errors.mobile}
          onChange={(event) => update('mobile', event.target.value)}
        />

        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          error={errors.password}
          hint="At least 8 characters"
          onChange={(event) => update('password', event.target.value)}
        />
        <TextField
          id="password2"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={values.password2}
          error={errors.password2}
          onChange={(event) => update('password2', event.target.value)}
        />

        <TextField
          id="fullName"
          label="Full name (as per ID)"
          value={values.fullName}
          error={errors.fullName}
          onChange={(event) => update('fullName', event.target.value)}
        />
        <TextField
          id="nickname"
          label="Nickname"
          value={values.nickname}
          error={errors.nickname}
          onChange={(event) => update('nickname', event.target.value)}
        />

        <TextField
          id="upline"
          label="Referral code (optional)"
          value={values.upline}
          error={errors.upline}
          onChange={(event) => update('upline', event.target.value)}
        />
      </div>

      <label className="text-muted flex items-start gap-2 text-xs">
        <input
          type="checkbox"
          checked={values.acceptedTerms}
          onChange={(event) => update('acceptedTerms', event.target.checked)}
          className="accent-accent mt-0.5"
        />
        <span>
          I am 18 or over and accept the terms &amp; conditions.
          {errors.acceptedTerms ? (
            <span role="alert" className="mt-1 block text-[11px] text-[var(--color-danger)]">
              {errors.acceptedTerms}
            </span>
          ) : null}
        </span>
      </label>

      <PrimaryButton type="submit" className="w-full">
        Create account
      </PrimaryButton>

      <FormNotice>
        Demo build: the form validates locally and stops there. No account is created.
      </FormNotice>
    </form>
  );
}
