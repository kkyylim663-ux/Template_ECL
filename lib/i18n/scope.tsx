import { NextIntlClientProvider } from 'next-intl';
import { SHELL_NAMESPACES, type Namespace } from './config';
import { loadMessages } from './messages';
import { getLocale } from './server';

/**
 * Wraps a page subtree with the client messages it needs. A nested provider
 * *replaces* the messages of the one above it (it does not merge), so the shell
 * namespaces always come along — pages ask only for their own additions.
 */
export async function IntlScope({
  namespaces = [],
  children,
}: {
  namespaces?: readonly Namespace[];
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await loadMessages(locale, [...new Set([...SHELL_NAMESPACES, ...namespaces])]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
