'use client';

import { useEffect, useState } from 'react';

export const OTP_COOLDOWN_SECONDS = 60;

/** Seconds until the next code may be requested. `running` disables the send button. */
export function useCountdown(seconds = OTP_COOLDOWN_SECONDS) {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (left <= 0) return;
    const timer = window.setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [left]);

  return { left, running: left > 0, start: () => setLeft(seconds) };
}
