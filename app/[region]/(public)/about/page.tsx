import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPageContent } from '@/lib/api';
import { regionPath } from '@/config/nav';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { brand } from '@/config/brand';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Markdown } from '@/components/content/Markdown';
import { JsonLd } from '@/components/content/JsonLd';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('about', { region, path: '/about' });
}

/**
 * About Us, in the reference's `.generalPage` shape: the copy as `.desc` blocks
 * (no page heading — the reference has none either), then the four-column
 * `contactUsContent`, whose values all come from `config/brand.ts`.
 */
export default async function AboutPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const [{ t }, page] = await Promise.all([getT('content'), getPageContent('about')]);
  if (!page) notFound();

  return (
    <IntlScope namespaces={['content']}>
      <div data-page="about" className="generalPage container-page">
        <JsonLd
          data={breadcrumbLd(
            [
              { name: brand.name, path: '' },
              { name: t('pages.about'), path: '/about' },
            ],
            region,
          )}
        />

        {page.sections.map((section) => (
          <div key={section.id} className="desc">
            <h3>{section.title}</h3>
            <Markdown source={section.body} />
          </div>
        ))}

        <div className="contactUsContent">
          <div>
            <p className="linkTitle">{t('about.contact')}</p>
            <div className="content">
              <a href={`tel:${brand.contact.phone.replace(/[^0-9+]/g, '')}`}>
                <Icon name="phone" size={25} />
                <span>{brand.contact.phone}</span>
              </a>
              <a href={`mailto:${brand.contact.email}`}>
                <Icon name="mail" size={25} />
                <span>{brand.contact.email}</span>
              </a>
              <a href={brand.contact.whatsapp.href}>
                <Icon name="whatsapp" size={25} />
                <span>{brand.contact.whatsapp.label}</span>
              </a>
            </div>
          </div>

          <div>
            <p className="linkTitle">{t('about.websites')}</p>
            <div className="content">
              {brand.websites.map((site) => (
                <a key={site.id} href={site.href}>
                  <Icon name="check" size={25} />
                  <span>{site.label}</span>
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="linkTitle">{t('about.service')}</p>
            <div className="content inline">
              <a href={regionPath(region, '/livechat')} aria-label={brand.contact.liveChat.label}>
                <Icon name="chat" size={25} />
              </a>
              <a href={brand.contact.telegram.href} aria-label={brand.contact.telegram.label}>
                <Icon name="telegram" size={25} />
              </a>
              <a href={brand.contact.whatsapp.href} aria-label={brand.contact.whatsapp.label}>
                <Icon name="whatsapp" size={25} />
              </a>
              <a href={brand.social[0].href} aria-label="Messenger">
                <Icon name="facebook" size={25} />
              </a>
            </div>
          </div>

          <div>
            <p className="linkTitle">{t('about.follow')}</p>
            <div className="content inline">
              {brand.social.map((entry) => (
                <a key={entry.id} href={entry.href} aria-label={entry.label}>
                  <Icon name={entry.id as IconName} size={20} className="about-follow-us__icon" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </IntlScope>
  );
}
