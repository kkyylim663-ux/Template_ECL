import type { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Open a demo account: email, code, username, password and mobile number.',
  robots: { index: false, follow: false },
};

export default async function RegisterPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;

  return (
    <div className="mx-auto w-full max-w-3xl py-6">
      <h1 className="text-ink text-xl font-semibold">Create account</h1>
      <p className="text-muted mt-1 text-xs">
        Email is used for verification and notices only. Every field is validated locally.
      </p>

      <div className="mt-5">
        <RegisterForm />
      </div>

      <p className="text-muted mt-5 text-xs">
        Already registered?{' '}
        <Link href={`/${region}/login`} className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
