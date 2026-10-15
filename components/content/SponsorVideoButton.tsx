'use client';

import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { IconSprite } from '@/components/ui/IconSprite';
import { useModal } from '@/components/ui/ModalProvider';

/**
 * The reference's `youtube-preview` button: a cover with a play badge whose click
 * opens a note. This build embeds nothing — no player, no external asset.
 */
export function SponsorVideoButton({
  id,
  title,
  tone,
}: {
  id: string;
  title: string;
  tone: number;
}) {
  const t = useTranslations('content');
  const modal = useModal();

  return (
    <>
      <IconSprite only={['play']} />
      <button
        type="button"
        data-video={id}
        aria-label={`${t('sponsor.videoTitle')}: ${title}`}
        className="youtube-preview"
        onClick={() => modal.message(t('sponsor.videoTitle'), t('sponsor.videoBody'))}
      >
        <span
          aria-hidden
          className="game-placeholder youtube-preview__cover"
          style={{ '--tone': String(tone) } as React.CSSProperties}
        >
          <span className="youtube-play-icon">
            <Icon name="play" size={20} />
          </span>
        </span>
      </button>
    </>
  );
}
