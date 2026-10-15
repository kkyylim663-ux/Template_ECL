'use client';

import { Fragment, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { useModal } from '@/components/ui/ModalProvider';

type RebateItem = {
  id: string;
  title: string;
  turnover: string;
  rate: string;
  claimFrom: string;
  amount: string;
  claimable: boolean;
};

/**
 * The rebates body: one accordion block per rebate record, the reference's
 * `.account-promotion__*` structure — triangle + title on the left, a Claim
 * button pinned right, then the body of ticked paragraphs and the green tips.
 * The original's copy is a birthday-bonus explainer; ours states the record's
 * own turnover, rate and claim date, which is the same block with mock data.
 */
export function RebateList({ items, currency }: { items: RebateItem[]; currency: string }) {
  const t = useTranslations('account');
  const modal = useModal();
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="account-promotion__wrapper">
      {items.map((item) => {
        const isOpen = open === item.id;
        return (
          <div key={item.id} className="account-promotion__container-desktop">
            <div className="account-promotion__header">
              <button
                type="button"
                className="pointer"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : item.id)}
              >
                <Icon
                  name="chevronDown"
                  size={11}
                  className={`account-promotion__triangle${isOpen ? ' open' : ''}`}
                />
                <span>{item.title}</span>
              </button>
              <div className="account-promotion__btn-wrapper">
                <button
                  type="button"
                  className={`btn btn-primary${item.claimable ? '' : ' disable'}`}
                  disabled={!item.claimable}
                  onClick={() =>
                    modal.success(
                      t('actions.demoClaimTitle'),
                      t('actions.demoClaimBody', { what: t('rebates.what', { product: item.title }), amount: item.amount }),
                    )
                  }
                >
                  {item.claimable ? t('rebates.claim') : t('rebates.claimed')}
                </button>
              </div>
            </div>
            <div className={`account-promotion__body${isOpen ? ' open' : ''}`}>
              {[
                t('rebates.turnoverLine', { amount: item.turnover }),
                t('rebates.rateLine', { rate: item.rate }),
                t('rebates.claimFrom', { date: item.claimFrom }),
              ].map((line) => (
                <Fragment key={line}>
                  <p className="account-promotion__paragraph disable" />
                  <div className="account-promotion__tick-wrapper">
                    <Icon name="check" size={16} className="account-promotion__tick-icon" />
                  </div>
                  {line}
                </Fragment>
              ))}
              <p className="account-promotion__tips">
                {t('rebates.tip', { amount: item.amount, currency })}
              </p>
              <p className="account-promotion__tips">{t('rebates.tipDemo')}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
