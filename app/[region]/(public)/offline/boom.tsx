'use client';

import { useEffect, useState } from 'react';

/**
 * MOCK-ONLY failure injection (T74), the sibling of the deposit receipt's
 * `?receiptFail=1`: mounts clean, then throws from an effect so the nearest
 * `error.tsx` renders in the browser exactly as it would for a real client
 * error. The module flag makes the throw one-shot per document, which is what
 * lets Retry (`reset()`) re-render this segment successfully.
 *
 * Mirrored in `app/dev/error-test/boom.tsx` on purpose: the standalone route
 * and the shelled offline page must not import from each other.
 */
let thrown = false;

export function Boom() {
  const [boom, setBoom] = useState(false);

  useEffect(() => {
    if (!thrown) {
      thrown = true;
      setBoom(true);
    }
  }, []);

  if (boom) throw new Error('T74 error boundary test (mock-only)');

  return null;
}
