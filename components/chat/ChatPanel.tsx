'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { brand } from '@/config/brand';

type ChatMode = 'room' | 'support';

interface ChatMessage {
  id: number;
  author: string;
  body: string;
  mine?: boolean;
}

const SUPPORT_CHIPS = ['chipDeposit', 'chipWithdrawal', 'chipBonus'] as const;

/**
 * The mock chat used by both chat pages (T81). The reference's dock opens its
 * own client-side chat panel and its Live Chat entry lands on the contact page
 * (probed live 2026-10-18); this build instead gives both entries real pages:
 * `/chat` is the player room (a pinned line plus a seeded conversation) and
 * `/livechat` is the support room (an agent greeting plus quick questions).
 * Sending appends the message and, after a short pause, a simulated reply —
 * nothing leaves the browser.
 */
export function ChatPanel({ mode }: { mode: ChatMode }) {
  const t = useTranslations('content');
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    mode === 'support'
      ? [{ id: 0, author: t('chat.supportTitle'), body: t('chat.supportSeed') }]
      : [
          { id: 0, author: `${brand.name} Team`, body: t('chat.roomSeed2') },
          { id: 1, author: 'AcePlayer88', body: t('chat.roomSeed1') },
          { id: 2, author: 'LuckyCat', body: t('chat.roomSeed3') },
        ],
  );
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const nextId = useRef(10);
  const replyIndex = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function replyBody() {
    if (mode === 'support') return t('chat.supportReply');
    const lines = [t('chat.roomReply1'), t('chat.roomReply2')];
    return lines[replyIndex.current++ % lines.length];
  }

  function send(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || typing) return;
    setMessages((previous) => [
      ...previous,
      { id: nextId.current++, author: t('chat.you'), body, mine: true },
    ]);
    setDraft('');
    setTyping(true);
    timer.current = setTimeout(() => {
      const author = mode === 'support' ? t('chat.supportTitle') : 'LuckyCat';
      setMessages((previous) => [...previous, { id: nextId.current++, author, body: replyBody() }]);
      setTyping(false);
    }, 900);
  }

  const title = mode === 'support' ? t('chat.supportTitle') : t('chat.roomTitle');

  return (
    <section className="chat-room" aria-label={title}>
      <header className="chat-room__head">
        <span className="chat-room__icon" aria-hidden>
          <Icon name="chat" size={26} />
        </span>
        <div className="chat-room__titles">
          <p className="chat-room__title">{title}</p>
          <p className="chat-room__subtitle">
            {mode === 'support' ? t('chat.supportSubtitle') : t('chat.roomSubtitle')}
          </p>
        </div>
        <span className="chat-room__online">
          <span className="chat-room__dot" aria-hidden />
          {t('chat.online')}
        </span>
      </header>

      {mode === 'room' ? (
        <p className="chat-room__pin">
          <strong>{t('chat.pinLabel')}:</strong> {t('chat.pin')}
        </p>
      ) : null}

      <ol className="chat-room__list" aria-live="polite">
        {messages.map((message) => (
          <li key={message.id} className={`chat-line${message.mine ? ' chat-line--mine' : ''}`}>
            {!message.mine ? <span className="chat-line__author">{message.author}</span> : null}
            <p className="chat-line__bubble">{message.body}</p>
          </li>
        ))}
        {typing ? (
          <li className="chat-line chat-line--typing">
            <span className="chat-line__bubble">…</span>
          </li>
        ) : null}
      </ol>

      {mode === 'support' ? (
        <div className="chat-room__chips" aria-label={t('chat.chipsLabel')}>
          {SUPPORT_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className="chat-room__chip"
              onClick={() => setDraft(t(`chat.${chip}`))}
            >
              {t(`chat.${chip}`)}
            </button>
          ))}
        </div>
      ) : null}

      {/* The reference's compose: the input owns its full-width row and the
          Send pill sits in a footer row next to the 0/120 counter — side by
          side with the input it overran the panel's right edge. */}
      <form className="chat-room__compose" onSubmit={send}>
        <label className="sr-only" htmlFor={`chat-input-${mode}`}>
          {t('chat.inputLabel')}
        </label>
        <div className="chat-text-area__wrapper">
          <input
            id={`chat-input-${mode}`}
            className="chat-text-area"
            value={draft}
            maxLength={120}
            placeholder={t('chat.placeholder')}
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
        <div className="chat-footer__word-wrapper">
          <span className="chat-footer__word">{draft.length}/120</span>
          <button type="submit" className="btn btn-primary">
            {t('chat.send')}
          </button>
        </div>
      </form>
      <p className="chat-room__note">{t('chat.mockNote')}</p>
    </section>
  );
}
