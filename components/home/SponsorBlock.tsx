import { Icon } from '@/components/ui/Icon';
import { IconSprite } from '@/components/ui/IconSprite';
import { InertLink } from '@/components/ui/InertLink';
import { getT } from '@/lib/i18n/server';

/**
 * Brand-ambassador block (`section.home-section.desktop` + `.home-sponsor__*`):
 * a 628x302 video frame with a mustard border next to a 279px intro column and a
 * portrait. Desktop only.
 *
 * The reference embeds a YouTube iframe and casts a real person; this build does
 * neither, so the frame and the portrait are placeholders and the intro says so.
 */
export async function SponsorBlock() {
  const { t } = await getT('home');

  return (
    <section className="home-section hidden desktop:block">
      {/* `play` is not shell chrome, so this block carries its own symbol. */}
      <IconSprite only={['play']} />
      <h2 className="section-title">{t('section.sponsors')}</h2>

      <div className="flex gap-[70px]">
        <div className="border-accent flex h-[302px] w-[628px] shrink-0 items-center overflow-hidden rounded-[var(--radius-panel)] border">
          <div className="game-placeholder text-ink/75 grid h-[266px] w-[626px] place-items-center text-xs leading-[normal]">
            <span className="flex items-center gap-2">
              <Icon name="play" size={22} />
              {t('sponsor.video')}
            </span>
          </div>
        </div>

        <div className="flex min-h-[302px] min-w-0 flex-1">
          <div className="text-ink mr-[47px] flex w-[279px] flex-col justify-center text-sm leading-[normal]">
            <h2 className="section-title">{t('sponsor.ambassador')}</h2>
            <h3 className="text-accent mb-[30px] text-sm leading-[normal]">{t('sponsor.name')}</h3>
            <p>{t('sponsor.bio')}</p>
            <p className="text-accent mt-5 mb-[15px]">{t('sponsor.followers', { count: '760K' })}</p>
            <InertLink
              ariaLabel={t('sponsor.instagram')}
              className="hover-grow text-ink hover:text-accent w-fit"
            >
              <Icon name="instagram" size={26} />
            </InertLink>
          </div>

          {/*
            Both items shrink on the reference build (279 → 267 and 302 → 288),
            which is what places the portrait at x=1082. `min-w-0` is what lets
            that happen: the original's portrait is an image, whose min-content
            width is its file, not the width it is painted at.
          */}
          <div
            data-ambassador-photo
            className="game-placeholder h-[302px] w-[302px] min-w-0 self-end"
          />
        </div>
      </div>
    </section>
  );
}
