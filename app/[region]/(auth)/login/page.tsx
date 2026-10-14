import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in with a username, an email address or a mobile number and OTP.',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ region: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { region } = await params;
  const query = await searchParams;
  const next = typeof query.next === 'string' ? query.next : undefined;

  return (
    <div className="mx-auto w-full max-w-md py-6">
      <h1 className="text-ink text-xl font-semibold">Sign in</h1>
      <p className="text-muted mt-1 text-xs">
        Three ways in, as on the reference build. This demo never contacts an auth service.
      </p>

      {next ? (
        <p className="border-accent text-accent mt-4 rounded-[var(--radius-tag)] border px-3 py-2 text-xs">
          You will continue to <span className="font-mono">{next}</span> after signing in.
        </p>
      ) : null}

      <div className="mt-5">
        <LoginForm next={next} />
      </div>

      <p className="text-muted mt-5 flex flex-wrap justify-between gap-2 text-xs">
        <Link href={`/${region}/forgot-password`} className="text-accent hover:underline">
          Forgot password?
        </Link>
        <Link href={`/${region}/register`} className="text-accent hover:underline">
          No account yet? Register
        </Link>
      </p>
    </div>
  );
}
