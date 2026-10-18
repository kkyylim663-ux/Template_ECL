import Link from 'next/link';
import { brand } from '@/config/brand';
import { getT } from '@/lib/i18n/server';
import { FOOTER_GROUPS, SOCIAL_LINKS, regionPath } from '@/config/nav';
import { Icon } from '@/components/ui/Icon';

/**
 * Desktop footer, measured from the original:
 * a 1300px container with five blocks (204/74/118/75/182px wide, space-between
 * inside it), each a 12px `#f5f5f5` heading 24px above 14px `--color-muted`
 * links spaced 16px apart; then a 2px `--color-panel-soft` divider (60px above,
 * 63px below) and a bottom row — brand mark + licence seal on the left,
 * "Follow Us" with 29px social icons on the right.
 *
 * The five blocks and their wording come from crawl/pages/my.html; the first one
 * lists the support channels straight from config/brand.ts.
 *
 * Desktop only: the original's mobile template (crawl/mobile/my_mobileUA.html)
 * carries none of this — no column footer, divider or brand row — so at <=768px
 * the floating bottom bar is the whole footer (T32, measured).
 */
export async function Footer({ region }: { region: string }) {
  const { t } = await getT('nav');

  return (
    <footer className="hidden desktop:mt-15 desktop:block">
      <div className="container-page flex flex-col gap-6 desktop:flex-row desktop:justify-between desktop:gap-0">
        {FOOTER_GROUPS.map((group) => (
          <div key={group.id} className="desktop:shrink-0">
            <p className="mb-6 text-xs leading-[14px] text-[#f5f5f5]">{t(group.titleKey)}</p>

            {group.id === 'help' ? (
              <ul>
                {/* The reference's own three lines, in its order: Live Chat,
                    then the phone, then the email — named, not labelled by the
                    channel's 24/7 availability (which is what this printed). */}
                <li>
                  <Link
                    href={regionPath(region, '/livechat')}
                    className="text-muted hover:text-accent block text-sm leading-[17px]"
                    style={{ marginBottom: '16px' }}
                  >
                    {t('support.liveChat')}
                  </Link>
                </li>
                <li>
                  <a
                    href={`tel:${brand.contact.phone.replace(/\s/g, '')}`}
                    className="text-muted hover:text-accent block text-sm leading-[17px]"
                    style={{ marginBottom: '16px' }}
                  >
                    {brand.contact.phone}
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${brand.contact.email}`}
                    className="text-muted hover:text-accent block text-sm leading-[17px]"
                    style={{ marginBottom: '16px' }}
                  >
                    {brand.contact.email}
                  </a>
                </li>
              </ul>
            ) : (
              <ul>
                {group.items.map((item) => (
                  <li key={`${item.href}-${item.labelKey}`}>
                    <Link
                      href={item.href === '#' ? '#' : regionPath(region, item.href)}
                      className="text-muted hover:text-accent block text-sm leading-[17px]"
                      style={{ marginBottom: '16px' }}
                    >
                      {t(item.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="container-page">
        <div className="bg-panel-soft mt-[60px] mb-[63px] h-0.5 w-full" />
      </div>

      <div className="container-page mb-[25px] flex flex-col gap-6 text-sm desktop:flex-row desktop:justify-between desktop:gap-0">
        <div className="flex items-end">
          <span className="border-line grid size-[145px] place-items-center rounded-[15px] border">
            <img
              src={brand.logo.src}
              alt={brand.logo.alt}
              width={112}
              height={36}
              className="h-auto w-[112px]"
            />
          </span>
          <a
            href={brand.legal.noticesUrl}
            className="text-muted ms-2.5 text-sm whitespace-nowrap"
            title={brand.legal.licence}
          >
            {t('footer.licence')}
          </a>
        </div>

        <div className="desktop:w-[235px]">
          <p className="text-muted">{t('footer.followUs')}</p>
          <div className="mt-3.5 flex items-center">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.id}
                href={social.href}
                aria-label={social.label}
                className="hover-grow text-muted hover:text-accent me-[22px] grid size-[29px] place-items-center transition-transform duration-300 hover:scale-110"
              >
                <Icon name={social.id} size={29} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
