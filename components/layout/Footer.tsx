import Link from 'next/link';
import { brand } from '@/config/brand';
import { getT } from '@/lib/i18n/server';
import { CONTACT_CHANNELS, FOOTER_GROUPS, SOCIAL_LINKS, regionPath } from '@/config/nav';
import { Icon } from '@/components/ui/Icon';

export async function Footer({ region }: { region: string }) {
  const { t } = await getT('nav');

  return (
    <footer className="border-line bg-panel mt-10 border-t">
      <div className="grid gap-8 px-[var(--pad-page-x)] py-10 desktop:grid-cols-[1.2fr_repeat(3,1fr)]">
        <div>
          <p className="text-ink text-lg font-semibold tracking-wide">{brand.name}</p>
          <p className="text-muted mt-1 text-sm">{brand.tagline}</p>
          <p className="text-muted mt-4 max-w-sm text-xs leading-relaxed">{brand.legal.licence}</p>
          <p className="text-muted mt-1 text-xs">{brand.legal.operator}</p>

          <ul className="mt-4 space-y-1.5">
            {CONTACT_CHANNELS.slice(0, 3).map((channel) => (
              <li key={channel.id}>
                <a
                  href={channel.href}
                  className="text-muted hover:text-accent inline-flex min-h-7 items-center gap-2 text-xs"
                >
                  <Icon name={channel.icon} size={16} />
                  <span className="text-ink/80">{t(channel.labelKey)}:</span>
                  <span>{channel.valueKey ? t(channel.valueKey) : channel.value}</span>
                </a>
              </li>
            ))}
          </ul>

          <ul className="mt-5 flex items-center gap-3">
            {SOCIAL_LINKS.map((social) => (
              <li key={social.id}>
                <a
                  href={social.href}
                  aria-label={social.label}
                  className="border-line text-muted hover:border-accent hover:text-accent grid size-11 place-items-center rounded-full border"
                >
                  <Icon name={social.id} size={18} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {FOOTER_GROUPS.map((group) => (
          <nav key={group.id} aria-label={t(group.titleKey)}>
            <h2 className="text-ink text-sm font-semibold">{t(group.titleKey)}</h2>
            <ul className="mt-3 space-y-2">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link href={regionPath(region, item.href)} className="text-muted hover:text-accent inline-flex min-h-7 items-center text-xs">
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-line flex flex-col gap-2 border-t px-[var(--pad-page-x)] py-4 desktop:flex-row desktop:items-center desktop:justify-between">
        <p className="text-muted text-xs">{brand.legal.ageNotice}</p>
        <p className="text-muted text-xs">{brand.legal.demoNotice}</p>
      </div>
    </footer>
  );
}
