import Link from 'next/link';
import type { LotteryBook } from '@/lib/api/schemas';
import { regionPath } from '@/config/nav';
import { InertLink } from '@/components/ui/InertLink';
import { getT } from '@/lib/i18n/server';

/**
 * The 4D Result block: seven operator cards in a four-column grid, exactly the
 * markup `crawl/pages/my_4d.html` renders. At <=768px the reference shows a
 * single card and a tab strip (its JS builds that strip, so only the `.selected`
 * rule survives in the CSS) — here the strip is a row of links carrying
 * `?book=`, which keeps the whole page server-rendered.
 */
export async function LotteryResultCards({
  books,
  region,
  activeId,
}: {
  books: LotteryBook[];
  region: string;
  activeId: string;
}) {
  const { t } = await getT('games');
  const base = regionPath(region, '/4d');

  return (
    <>
      <div className="lottery-tabs" role="group" aria-label={t('fourD.tabs')}>
        {books.map((book) => (
          <Link
            key={book.id}
            href={`${base}?book=${book.id}`}
            aria-current={book.id === activeId ? 'true' : undefined}
            className="nav-pill"
          >
            {book.name}
          </Link>
        ))}
      </div>

      <div className="lottery-result__wrapper">
        {books.map((book) => (
          <article
            key={book.id}
            data-book={book.id}
            className={`lottery-result__card${book.id === activeId ? ' selected' : ''}`}
          >
            <header className={`lottery-result__header result-header-${book.id}`}>
              <span
                aria-hidden
                className="lottery-result__logo game-placeholder"
                style={{ '--tone': String(toneFor(book.id)) } as React.CSSProperties}
              />
              <div className="lottery-result__title-wrapper">
                <p>{book.name}</p>
                <p>{book.date}</p>
              </div>
            </header>

            <div className="lottery-result__body">
              <div className="lottery-result__grand-prize">
                <div>{t('fourD.prize1')}</div>
                <div>{book.first}</div>
              </div>
              <div className="lottery-result__grand-prize">
                <div>{t('fourD.prize2')}</div>
                <div>{book.second}</div>
              </div>
              <div className="lottery-result__grand-prize">
                <div>{t('fourD.prize3')}</div>
                <div>{book.third}</div>
              </div>

              <div className="lottery-result__section-title">{t('fourD.special')}</div>
              <div className="lottery-result__number-wrapper">
                <div className="lottery-result__number-container">
                  {book.special.map((number) => (
                    <span key={number}>{number}</span>
                  ))}
                </div>
              </div>

              <div className="lottery-result__section-title">{t('fourD.consolation')}</div>
              <div className="lottery-result__number-wrapper">
                <div className="lottery-result__number-container">
                  {book.consolation.map((number) => (
                    <span key={number}>{number}</span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="lottery-result__bet-now__wrapper">
        <InertLink className="btn btn-primary">{t('fourD.betNow')}</InertLink>
      </div>
    </>
  );
}

/** Stable per-operator hue for the artwork placeholder (the logos are not shipped). */
function toneFor(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}
