'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { brand } from '@/config/brand';

/**
 * The header's chat entry and the window it opens (T81 follow-up): the
 * reference's own `.chat-wrapper` — "ChitChat" with the Rules pill, the pinned
 * banner, the message body and the compose footer — dropping from the icon on
 * desktop and going full-screen below 769px. Sending is local: the line is
 * appended and a simulated reply lands a beat later, like the chat pages.
 */
const EMOJI = ['😀', '😁', '😂', '😃', '😄', '😅', '😆', '😇', '😈', '😉', '😊', '😋', '😌', '😍', '😎', '😏'];

type Line = { id: number; author: string; body: string; mine?: boolean };

export function ChatWindow() {
  // Shell furniture: the window rides in the header, so its copy lives in
  // `nav.chatWindow` (the shell's namespace) — a `content.*` key would render
  // as a raw key path here (the shell never scopes that namespace).
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(true);
  const [emoji, setEmoji] = useState(false);
  const [rules, setRules] = useState(false);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [lines, setLines] = useState<Line[]>(() => [
    { id: 0, author: 'LuckyCat', body: t('chatWindow.seed1') },
    { id: 1, author: 'AcePlayer88', body: t('chatWindow.seed3') },
  ]);
  const nextId = useRef(10);
  const replies = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchor = useRef<HTMLDivElement>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!anchor.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function send(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || typing) return;
    setLines((current) => [...current, { id: nextId.current++, author: t('chatWindow.you'), body, mine: true }]);
    setDraft('');
    setEmoji(false);
    setTyping(true);
    timer.current = setTimeout(() => {
      const pool = [t('chatWindow.reply1'), t('chatWindow.reply2')];
      setLines((current) => [
        ...current,
        { id: nextId.current++, author: 'LuckyCat', body: pool[replies.current++ % pool.length] },
      ]);
      setTyping(false);
    }, 900);
  }

  return (
    <div ref={anchor} className="chat-window-anchor me-8 shrink-0">
      {/* The reference's header chat icon opens its chat window. */}
      <button
        type="button"
        aria-label={t('ui.chat')}
        aria-expanded={open}
        aria-controls="chat-window"
        onClick={() => setOpen((value) => !value)}
        className="relative block cursor-pointer"
      >
        <Icon name="chat" size={25} className="text-ink" />
        <span className="bg-danger absolute -top-2 -right-2 size-2 rounded-full" aria-hidden />
      </button>

      {open ? (
        <div id="chat-window" role="dialog" aria-label={t('chatWindow.title')} className="chat-wrapper">
          <div className="chat-header">
            {t('chatWindow.title')}
            <div className="chat-header__right-wrapper">
              <button
                type="button"
                className="chat-header__pin"
                aria-label={t('chatWindow.pin')}
                aria-pressed={pinned}
                onClick={() => setPinned((value) => !value)}
              >
                <Icon name="pin" size={20} className="text-ink" />
              </button>
              <button type="button" className="chat-header__rules" onClick={() => setRules(true)}>
                {t('chatWindow.rules')}
              </button>
              <button
                type="button"
                className="chat-header__close-wrapper"
                aria-label={t('chatWindow.close')}
                onClick={() => setOpen(false)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          </div>

          {/* T76: a scrollable region needs keyboard access. */}
          <div
            className={`chat-pin__wrapper${pinned ? ' active' : ''}`}
            role="region"
            aria-label={t('chatWindow.pin')}
            tabIndex={0}
          >
            <Icon name="pin" size={16} className="text-ink mt-1 shrink-0" />
            <div className="chat-pin__content-wrapper">
              <span>{t('chatWindow.pinned')}</span>
            </div>
          </div>

          {/* T76: a scrollable region needs keyboard access. */}
          <div className="chat-body" role="region" aria-label={t('chatWindow.title')} tabIndex={0}>
            <ol className="chat-window__lines" aria-live="polite">
              {lines.map((line) => (
                <li key={line.id} className={`chat-line${line.mine ? ' chat-line--mine' : ''}`}>
                  {!line.mine ? <span className="chat-line__author">{line.author}</span> : null}
                  <p className="chat-line__bubble">{line.body}</p>
                </li>
              ))}
              {typing ? (
                <li className="chat-line chat-line--typing">
                  <span className="chat-line__bubble">…</span>
                </li>
              ) : null}
            </ol>
          </div>

          <form className="chat-footer" onSubmit={send}>
            <label className="sr-only" htmlFor="chat-window-input">
              {t('chatWindow.inputLabel')}
            </label>
            <div className="chat-text-area__wrapper">
              <input
                id="chat-window-input"
                className="chat-text-area"
                value={draft}
                maxLength={120}
                placeholder={t('chatWindow.placeholder')}
                onChange={(event) => setDraft(event.target.value)}
              />
              <button
                type="button"
                className="chat-text-area__right"
                aria-label={t('chatWindow.emoji')}
                aria-expanded={emoji}
                onClick={() => setEmoji((value) => !value)}
              >
                <span aria-hidden>🙂</span>
              </button>
            </div>
            <div className="chat-footer__word-wrapper">
              <div>{draft.length}/120</div>
              <button type="submit" className="btn btn-primary">
                {t('chatWindow.send')}
              </button>
            </div>
          </form>

          {emoji ? (
            <div className="emoji-wrapper active">
              <div className="emoji-header">
                <div>{t('chatWindow.emoji')}</div>
                <button type="button" aria-label={t('chatWindow.close')} onClick={() => setEmoji(false)}>
                  <Icon name="close" size={16} />
                </button>
              </div>
              <div className="emoji-list__wrapper">
                <div
                  className="emoji-list__container"
                  role="region"
                  aria-label={t('chatWindow.emoji')}
                  tabIndex={0}
                >
                  {EMOJI.map((glyph) => (
                    <button
                      key={glyph}
                      type="button"
                      className="emoji-list__inside"
                      onClick={() => setDraft((value) => `${value}${glyph}`.slice(0, 120))}
                    >
                      <span role="img" aria-label={glyph}>
                        {glyph}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <Modal open={rules} onClose={() => setRules(false)} variant="rules" title={t('chatWindow.rules')}>
        {t('chatWindow.note')}
      </Modal>
    </div>
  );
}
