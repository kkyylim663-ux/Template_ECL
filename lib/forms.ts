import { z } from 'zod';

/**
 * Form schemas. Kept free of any server import so the same rules run in the
 * browser (and, later, against the real API). Messages are the ones a player
 * reads, so they say what to do, not which rule failed.
 */

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email address')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Enter a valid email address');

const mobile = z
  .string()
  .trim()
  .min(6, 'Enter a valid mobile number')
  .regex(/^[0-9+\s-]{6,20}$/, 'Enter a valid mobile number');

const otpCode = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code');

export const loginUsernameSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
});

export const loginEmailSchema = z.object({
  identifier: email,
  password: z.string().min(1, 'Enter your password'),
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
      .regex(/^[A-Za-z0-9]{4,20}$/, '4-20 letters or digits, no spaces'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password2: z.string().min(1, 'Repeat your password'),
    fullName: z.string().trim().min(2, 'Enter your full name as printed on your ID'),
    nickname: z.string().trim().min(2, 'Enter a nickname'),
    mobile,
    upline: z.string().trim().optional(),
    acceptedTerms: z.literal(true, { message: 'You must accept the terms to continue' }),
  })
  .refine((values) => values.password === values.password2, {
    message: 'Passwords do not match',
    path: ['password2'],
  });

export const forgotPasswordSchema = z.object({ email });

export const depositSchema = z.object({
  method: z.enum(['bank', 'gateway']),
  amount: z
    .number({ message: 'Enter the amount you transferred' })
    .positive('Enter an amount greater than 0'),
  bankId: z.string().optional(),
  senderName: z.string().trim().optional(),
  senderAccount: z.string().trim().optional(),
  bankReference: z.string().trim().optional(),
  channelId: z.string().optional(),
});

export const withdrawalSchema = z.object({
  bankAccountId: z.string().min(1, 'Choose a bank account'),
  amount: z.number({ message: 'Enter the amount to withdraw' }).positive('Enter an amount greater than 0'),
});

export const transferSchema = z
  .object({
    fromCode: z.string().min(1, 'Choose a source wallet'),
    toCode: z.string().min(1, 'Choose a destination wallet'),
    amount: z.number({ message: 'Enter the amount to transfer' }).positive('Enter an amount greater than 0'),
  })
  .refine((values) => values.fromCode !== values.toCode, {
    message: 'Choose two different wallets',
    path: ['toCode'],
  });

/**
 * Profile edits, with the password block optional. Either all three password
 * fields are filled (and the new one is long enough and matches), or none are.
 */
export const profileSchema = z
  .object({
    nickname: z.string().trim().min(2, 'Enter a nickname').max(24, 'Nickname is too long'),
    fullName: z.string().trim().min(2, 'Enter your full name'),
    mobile: mobile.optional(),
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
      message: 'Fill all three password fields; the new one needs 8+ characters and must match',
      path: ['newPassword'],
    },
  );

export type FieldErrors = Record<string, string>;

/** First message per field, ready to render next to its input. */
export function collectErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? 'form');
    errors[field] ??= issue.message;
  }
  return errors;
}

/** Validates and returns either the values or the per-field messages. */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  values: unknown,
): { ok: true; data: z.infer<T> } | { ok: false; errors: FieldErrors } {
  const parsed = schema.safeParse(values);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, errors: collectErrors(parsed.error) };
}
