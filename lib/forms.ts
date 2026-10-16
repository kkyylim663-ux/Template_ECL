import { z } from 'zod';
import { parseAmountMinor } from './format';

/**
 * Form schemas. Kept free of any server import so the same rules run in the
 * browser (and, later, against the real API).
 *
 * Messages are KEYS under `common.validation.*`, not sentences: zod runs outside
 * React, so the component that renders the error is the one that translates it
 * (`t(errors.field)` — see the auth and account forms). That keeps the wording in
 * the message files, where the four languages stay in step.
 */

const email = z
  .string()
  .trim()
  .min(1, 'validation.emailRequired')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'validation.emailInvalid');

const mobile = z
  .string()
  .trim()
  .min(6, 'validation.mobileInvalid')
  .regex(/^[0-9+\s-]{6,20}$/, 'validation.mobileInvalid');

const otpCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'validation.otpInvalid');

/** On the profile a blank field means "leave it as it is", so '' passes. */
const optionalMobile = z.union([mobile, z.literal('')]).optional();

export const loginUsernameSchema = z.object({
  identifier: z.string().trim().min(1, 'validation.usernameRequired'),
  password: z.string().min(1, 'validation.passwordRequired'),
});

export const loginEmailSchema = z.object({
  identifier: email,
  password: z.string().min(1, 'validation.passwordRequired'),
});

export const loginOtpSchema = z.object({
  identifier: mobile,
  otp: otpCode,
});

export const registerSchema = z
  .object({
    email,
    emailOtp: otpCode,
    username: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9]{4,20}$/, 'validation.usernameFormat'),
    password: z.string().min(8, 'validation.passwordShort'),
    password2: z.string().min(1, 'validation.passwordRepeat'),
    fullName: z.string().trim().min(2, 'validation.fullNameRequired'),
    nickname: z.string().trim().min(2, 'validation.nicknameRequired'),
    mobile,
  })
  .refine((values) => values.password === values.password2, {
    message: 'validation.passwordMismatch',
    path: ['password2'],
  });

export const forgotPasswordSchema = z.object({ email });

/** Forgot-password step one: the account email plus the 6-digit code sent to it. */
export const forgotIdentitySchema = z.object({ email, otp: otpCode });

/** Forgot-password step two: the new password typed twice. */
export const forgotResetSchema = z
  .object({
    password: z.string().min(8, 'validation.passwordShort'),
    password2: z.string().min(1, 'validation.passwordRepeat'),
  })
  .refine((values) => values.password === values.password2, {
    message: 'validation.passwordMismatch',
    path: ['password2'],
  });

/** Contact page demo form — validated locally, nothing is sent (T23). */
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'validation.nameRequired'),
  email,
  subject: z.string().trim().min(1, 'validation.subjectRequired'),
  message: z.string().trim().min(10, 'validation.messageShort'),
});

/**
 * The bank-transfer deposit form (T52). `amount` arrives as the field shows it
 * ("1,234.50") and is parsed here into minor units; the three amount failures
 * mirror the reference's own error codes — 52 "Deposit Amount Less Than Bank
 * Minimum Requirement" and 53 "… More Than Bank … Requirement". The limits come
 * from the method, so the same schema serves every rail.
 */
export function bankDepositSchema({ minMinor, maxMinor }: { minMinor: number; maxMinor: number }) {
  return z.object({
    bankId: z.string().min(1, 'validation.bankRequired'),
    amount: z
      .string()
      .trim()
      .min(1, 'validation.amountDeposit')
      .refine((value) => parseAmountMinor(value) !== null, {
        message: 'validation.amountFormat',
      })
      .refine((value) => (parseAmountMinor(value) ?? 0) >= minMinor, {
        message: 'validation.amountBelowMin',
      })
      .refine((value) => (parseAmountMinor(value) ?? Infinity) <= maxMinor, {
        message: 'validation.amountAboveMax',
      }),
    terms: z.boolean().refine((accepted) => accepted, { message: 'validation.terms' }),
  });
}

/**
 * The payment-gateway deposit form (T54): the same amount rules and the same
 * 52/53 failure wording as the bank rail, minus the bank pick — the gateway
 * method has none.
 */
export function gatewayDepositSchema({
  minMinor,
  maxMinor,
}: {
  minMinor: number;
  maxMinor: number;
}) {
  return z.object({
    amount: z
      .string()
      .trim()
      .min(1, 'validation.amountDeposit')
      .refine((value) => parseAmountMinor(value) !== null, {
        message: 'validation.amountFormat',
      })
      .refine((value) => (parseAmountMinor(value) ?? 0) >= minMinor, {
        message: 'validation.amountBelowMin',
      })
      .refine((value) => (parseAmountMinor(value) ?? Infinity) <= maxMinor, {
        message: 'validation.amountAboveMax',
      }),
    terms: z.boolean().refine((accepted) => accepted, { message: 'validation.terms' }),
  });
}

export const withdrawalSchema = z.object({
  bankAccountId: z.string().min(1, 'validation.bankRequired'),
  amount: z.number({ message: 'validation.amountWithdraw' }).positive('validation.amountPositive'),
});

export const transferSchema = z
  .object({
    fromCode: z.string().min(1, 'validation.walletFrom'),
    toCode: z.string().min(1, 'validation.walletTo'),
    amount: z
      .number({ message: 'validation.amountTransfer' })
      .positive('validation.amountPositive'),
  })
  .refine((values) => values.fromCode !== values.toCode, {
    message: 'validation.walletSame',
    path: ['toCode'],
  });

/**
 * Profile edits, with the password block optional. Either all three password
 * fields are filled (and the new one is long enough and matches), or none are.
 */
export const profileSchema = z
  .object({
    nickname: z
      .string()
      .trim()
      .min(2, 'validation.nicknameRequired')
      .max(24, 'validation.nicknameLong'),
    fullName: z.string().trim().min(2, 'validation.fullNamePlain'),
    /** Editable since T49 (nickname / email / mobile are the member's own fields). */
    email,
    mobile: optionalMobile,
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (values) => {
      const touchingPassword = Boolean(
        values.currentPassword || values.newPassword || values.confirmPassword,
      );
      if (!touchingPassword) return true;
      return (
        Boolean(values.currentPassword) &&
        (values.newPassword?.length ?? 0) >= 8 &&
        values.newPassword === values.confirmPassword
      );
    },
    {
      message: 'validation.passwordAllThree',
      path: ['newPassword'],
    },
  );

/** Field name → message key (e.g. `validation.emailInvalid`), not a sentence. */
export type FieldErrors = Record<string, string>;

/** First message per field, ready for the component to translate. */
export function collectErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? 'form');
    errors[field] ??= issue.message;
  }
  return errors;
}

/** Validates and returns either the values or the per-field message keys. */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  values: unknown,
): { ok: true; data: z.infer<T> } | { ok: false; errors: FieldErrors } {
  const parsed = schema.safeParse(values);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, errors: collectErrors(parsed.error) };
}
