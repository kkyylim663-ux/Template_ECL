import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Reset password',
  description: 'Request a password reset link.',
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;

  return (
    <div className="mx-auto w-full max-w-md py-6">
      <h1 className="text-ink text-xl font-semibold">Reset password</h1>
      <p className="text-muted mt-1 text-xs">
        We email a reset link if the address is registered with us.
      </p>

      <div className="mt-5">
        <ForgotPasswordForm />
      </div>

      <p className="text-muted mt-5 text-xs">
        <Link href={`/${region}/login`} className="text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
