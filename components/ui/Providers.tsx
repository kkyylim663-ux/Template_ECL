'use client';

import type { ReactNode } from 'react';
import { ModalProvider } from './ModalProvider';
import { ToastProvider } from './Toast';

/** Client-side providers mounted once in the root layout. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ModalProvider>{children}</ModalProvider>
    </ToastProvider>
  );
}
