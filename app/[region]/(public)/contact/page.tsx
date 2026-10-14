import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { brand } from '@/config/brand';
import { getPageContent } from '@/lib/api';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { Icon, type IconName } from '@/components/ui/Icon';
import { LongFormPage } from '@/components/content/LongFormPage';
import { ContactForm } from '@/components/content/ContactForm';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('contact', { region, path: '/contact' });
}

/**
 * Contact Us — the shared long-form layout plus three page-only blocks: the
 * contact cards (values come from `config/brand.ts`, so re-branding is one
 * file), the social row, and a demo form that validates locally and says it
 * sent nothing.
 */
export default async function ContactPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const [{ t }, page] = await Promise.all([getT('content'), getPageContent('contact')]);
  if (!page) notFound();

  const cards: { id: string; icon: IconName; title: string; value: string; href: string }[] = [
    {
      id: 'live-chat',
      icon: 'chat',
      title: brand.contact.liveChat.label,
      value: brand.contact.liveChat.availability,
      href: brand.contact.liveChat.href,
    },
    {
      id: 'email',
      icon: 'mail',
      title: t('contact.emailLabel'),
      value: brand.contact.email,
      href: `mailto:${brand.contact.email}`,
    },
    {
      id: 'phone',
      icon: 'phone',
      href: `tel:${brand.contact.phone.replace(/[^0-9+]/g, '')}`,
      title: t('contact.phoneLabel'),
      value: brand.contact.phone,
    },
    {
      id: 'whatsapp',
      icon: 'whatsapp',
      title: brand.contact.whatsapp.label,
      value: brand.contact.whatsapp.href === '#' ? '—' : brand.contact.whatsapp.href,
      href: brand.contact.whatsapp.href,
    },
    {
      id: 'telegram',
      icon: 'telegram',
      title: brand.contact.telegram.label,
      value: brand.contact.telegram.href === '#' ? '—' : brand.contact.telegram.href,
      href: brand.contact.telegram.href,
    },
  ];

  return (
    <IntlScope namespaces={['content']}>
      <LongFormPage
        region={region}
        title={t('pages.contact')}
        page={page}
        blocks={[
          {
            id: 'cards',
            title: t('contact.cardsTitle'),
            node: (
              <ul className="grid gap-3 desktop:grid-cols-2" data-contact-cards>
                {cards.map((card) => (
                  <li key={card.id}>
                    <a
                      href={card.href}
                      data-contact-card={card.id}
                      className="border-line bg-panel hover:border-accent flex items-start gap-3 rounded-[var(--radius-panel)] border p-4 transition-colors"
                    >
                      <span className="border-line text-accent grid size-9 shrink-0 place-items-center rounded-full border">
                        <Icon name={card.icon} size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="text-ink block text-xs font-semibold">{card.title}</span>
                        <span className="text-muted block truncate text-[11px]">{card.value}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ),
          },
          {
            id: 'social',
            title: t('contact.socialTitle'),
            node: (
              <ul className="flex flex-wrap gap-2" data-contact-social>
                {brand.social.map((entry) => (
                  <li key={entry.id}>
                    <a
                      href={entry.href}
                      data-social={entry.id}
                      className="border-line bg-panel text-muted hover:border-accent hover:text-ink inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-tag)] border px-3 py-2 text-xs transition-colors"
                    >
                      <Icon name={entry.id as IconName} size={16} />
                      {entry.label}
                    </a>
                  </li>
                ))}
              </ul>
            ),
          },
          {
            id: 'form',
            title: t('contact.formTitle'),
            node: (
              <div className="border-line bg-panel rounded-[var(--radius-panel)] border p-4 desktop:p-5">
                <ContactForm />
              </div>
            ),
          },
        ]}
      />
    </IntlScope>
  );
}
