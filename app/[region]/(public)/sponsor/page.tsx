import type { Metadata } from 'next';
import { getSponsorBlocks } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { IntlScope } from '@/lib/i18n/scope';
import { JsonLd } from '@/components/content/JsonLd';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';
import { brand } from '@/config/brand';
import { SponsorVideoButton } from '@/components/content/SponsorVideoButton';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('sponsor', { region, path: '/sponsor' });
}

/**
 * Sponsor page, DOM after the reference's `sponsor-warapper`: the header banner,
 * the logo-evolution card, the year rail, then one `yearContainer` per year (a
 * video banner over a grid of short clips). The reference's own
 * `/static/sponsor/*.css` was never crawled and 404s live, so the styling here is
 * this build's own; structure, copy slots and class names follow the snapshot.
 */
export default async function SponsorPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const [{ t }, sponsor] = await Promise.all([getT('content'), getSponsorBlocks()]);

  return (
    <IntlScope namespaces={['content']}>
      <div data-page="sponsor" className="sponsor-warapper container-page">
        <JsonLd
          data={breadcrumbLd(
            [
              { name: brand.name, path: '' },
              { name: t('pages.sponsor'), path: '/sponsor' },
            ],
            region,
          )}
        />

        <section id="sponsorHeader">
          <span aria-hidden className="game-placeholder sponsorHeader__img" />
        </section>

        <section id="logoEvolution" aria-labelledby="logoEvolutionTitle">
          <h2 id="logoEvolutionTitle" className="section-title">
            {t('sponsor.logoTitle')}
          </h2>
          <div className="logo-evolution-card">
            <div className="logo-evolution-brands">
              <span
                aria-hidden
                className="game-placeholder logo-evolution-original"
                style={{ '--tone': String(sponsor.logo.toneOriginal) } as React.CSSProperties}
              />
              <span className="logo-evolution-divider" aria-hidden="true" />
              <span
                aria-hidden
                className="game-placeholder logo-evolution-current"
                style={{ '--tone': String(sponsor.logo.toneCurrent) } as React.CSSProperties}
              />
            </div>
            <p className="logo-evolution-period">
              <span className="hidden desktop:inline">{sponsor.logo.periodDesktop}</span>
              <span className="desktop:hidden">{sponsor.logo.periodMobile}</span>
            </p>
          </div>
        </section>

        <section id="yearTabContainer">
          <nav className="horizontalYearContainer" aria-label={t('sponsor.yearsLabel')}>
            <div className="years">
              {sponsor.years.map((year) => (
                <a key={year.id} href={`#${year.id}`} className="year" data-year={year.id}>
                  {year.label}
                </a>
              ))}
            </div>
          </nav>
        </section>

        {sponsor.years.map((year) => (
          <section key={year.id} id={year.id} className="yearContainer">
            <div className="yearDivider">
              <span className="yearDivider__line" aria-hidden="true" />
              <p>{year.label}</p>
              <span className="yearDivider__line" aria-hidden="true" />
            </div>

            <div className="videoContainer">
              <p className="title">{year.videoTitle}</p>
              <div className="video">
                <div className="iframeWrapper">
                  <SponsorVideoButton
                    id={year.videoId}
                    title={year.videoTitle}
                    tone={year.videoTone}
                  />
                </div>
              </div>
            </div>

            <div className="shortVideoContainer">
              <p className="title">{year.shortsTitle}</p>
              <div className="shortVideoGrid">
                {year.shorts.map((short) => (
                  <div key={short.id} className="shortVideoItem" data-short={short.id}>
                    <span
                      aria-hidden
                      className="game-placeholder shortVideoItem__img"
                      style={{ '--tone': String(short.tone) } as React.CSSProperties}
                    />
                    <p className="shortVideoItem__title">{short.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </IntlScope>
  );
}
