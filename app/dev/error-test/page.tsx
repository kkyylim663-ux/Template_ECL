// MOCK-ONLY: /dev/error-test 仅 mock 模式可见（非 mock 直接 404）。接后台后可删。
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MOCK_MODE } from '@/lib/api/client';
import { Boom } from './boom';

export const metadata: Metadata = {
  title: 'Error boundary test',
  robots: { index: false, follow: false },
};

/**
 * Forced failure for the T74 boundaries: `?boom=1` in mock mode mounts a
 * component that throws in the browser, so `app/error.tsx` renders and its
 * Retry recovers; any other hit is a 404 like on the other mock-only routes.
 */
export default async function ErrorTestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  if (!MOCK_MODE || query.boom !== '1') notFound();

  return (
    <>
      <Boom />
      {/* The marker the boundary spec looks for once Retry has recovered. */}
      <div data-testid="error-test-recovered" className="p-8" />
    </>
  );
}
