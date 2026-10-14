'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { LazyImage } from '@/components/ui/LazyImage';
import { Marquee } from '@/components/ui/Marquee';
import { useModal } from '@/components/ui/ModalProvider';
import { GameCardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';

/** Every base component on one page, so each one can be seen and prodded. */
export function ComponentsDemo() {
  const t = useTranslations('common');
  const tg = useTranslations('games');
  const modal = useModal();
  const toast = useToast();
  const [tab, setTab] = useState('all');

  const demoTabs: TabItem[] = [
    { id: 'top', label: tg('tabs.top'), count: 26 },
    { id: 'all', label: tg('tabs.all'), count: 698 },
    { id: 'new', label: tg('tabs.new'), count: 12 },
    { id: 'bbonus', label: tg('tabs.bbonus'), count: 40 },
  ];

  const demoTiles = Array.from({ length: 12 }, (_, index) => ({
    id: `tile-${index}`,
    name: t('dev.tileName', { index: index + 1 }),
    tone: (index * 37) % 359,
  }));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <p className="text-muted text-[11px] tracking-widest uppercase">{t('dev.eyebrow')}</p>
      <h1 className="text-ink mt-1 text-2xl font-semibold">{t('dev.title')}</h1>
      <p className="text-muted mt-2 text-sm">{t('dev.intro')}</p>

      <section className="mt-8">
        <h2 className="text-ink text-sm font-semibold">{t('dev.modalVariants')}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <DemoButton
            onClick={() =>
              modal.success(t('dev.demo.successTitle'), t('dev.demo.successBody'))
            }
          >
            {t('modal.success')}
          </DemoButton>
          <DemoButton onClick={() => modal.error(t('dev.demo.errorTitle'), t('dev.demo.errorBody'))}>
            {t('modal.error')}
          </DemoButton>
          <DemoButton onClick={() => modal.alert(t('dev.demo.alertTitle'), t('dev.demo.alertBody'))}>
            {t('modal.alert')}
          </DemoButton>
          <DemoButton
            onClick={() => modal.status(t('dev.demo.statusTitle'), t('dev.demo.statusBody'))}
          >
            {t('modal.status')}
          </DemoButton>
          <DemoButton
            onClick={() => modal.message(t('dev.demo.messageTitle'), t('dev.demo.messageBody'))}
          >
            {t('modal.message')}
          </DemoButton>
          <DemoButton onClick={() => modal.loading(t('dev.demo.loadingTitle'))}>
            {t('modal.loading')}
          </DemoButton>
          <DemoButton
            onClick={() => modal.rules(t('dev.demo.rulesTitle'), t('dev.demo.rulesBody'))}
          >
            {t('modal.rules')}
          </DemoButton>
          <DemoButton
            onClick={() =>
              modal.confirm(t('dev.demo.confirmTitle'), t('dev.demo.confirmBody'), () =>
                toast.success(t('dev.demo.toastCancelled')),
              )
            }
          >
            {t('dev.confirmFlow')}
          </DemoButton>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-ink text-sm font-semibold">{t('dev.toastTitle')}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <DemoButton label={t('dev.toastInfo')} onClick={() => toast.show(t('dev.demo.toastBalance'))} />
          <DemoButton
            label={t('dev.toastSuccess')}
            onClick={() => toast.success(t('dev.demo.toastVoucher'))}
          />
          <DemoButton
            label={t('dev.toastError')}
            onClick={() => toast.error(t('dev.demo.toastAmount'))}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-ink text-sm font-semibold">{t('dev.tabsTitle')}</h2>
        <div className="mt-3">
          <Tabs tabs={demoTabs} value={tab} onChange={setTab} label={t('dev.demoTabs')} />
          <p className="text-muted mt-2 text-xs">{t('dev.activeTab', { tab })}</p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-ink text-sm font-semibold">{t('dev.skeletonTitle')}</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 desktop:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <GameCardSkeleton key={index} />
          ))}
        </div>
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-ink text-sm font-semibold">{t('dev.marqueeTitle')}</h2>
      </section>
      <Marquee
        className="mt-3 rounded-[var(--radius-tag)]"
        items={[
          t('dev.demo.marquee1'),
          t('dev.demo.marquee2'),
          t('dev.demo.marquee3'),
          t('dev.demo.marquee4'),
        ]}
      />

      <section className="mt-8">
        <h2 className="text-ink text-sm font-semibold">{t('dev.lazyImageTitle')}</h2>
        <p className="text-muted mt-1 text-xs">{t('dev.lazyImageHint')}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 desktop:grid-cols-6">
          {demoTiles.map((tile) => (
            <LazyImage
              key={tile.id}
              src="/brand/tile.svg"
              alt={tile.name}
              tone={tile.tone}
              className="rounded-[var(--radius-panel)] border border-line"
            />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 desktop:grid-cols-6">
          {demoTiles.slice(0, 6).map((tile) => (
            <LazyImage
              key={`no-src-${tile.id}`}
              alt={tile.name}
              tone={tile.tone}
              className="rounded-[var(--radius-panel)] border border-line"
            />
          ))}
        </div>
      </section>

      <div className="h-40" />
    </main>
  );
}

function DemoButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label?: string;
  children?: React.ReactNode;
}) {
  const t = useTranslations('common');

  return (
    <button
      type="button"
      onClick={onClick}
      className="border-line text-ink hover:border-accent hover:text-accent rounded-[8px] border px-3 py-2 text-xs font-medium"
    >
      {label ?? t('dev.openModal', { name: String(children) })}
    </button>
  );
}
