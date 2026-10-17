'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LaunchGateModal } from '@/components/game/LaunchGateModal';
import { LaunchButton } from '@/components/game/LaunchButton';
import { Modal } from '@/components/ui/Modal';
import { launchGate, type LaunchGate } from '@/lib/game/launch-gate';
import { useSession } from '@/lib/session/useSession';

/**
 * The contest card's action row: the reference's own pair — "Play next round"
 * and "Rules" (`ng-contest__actions`). T67 wires both: the play click runs the
 * T61/T62 launch gate (studio block first, then session, then balance), and the
 * rules button opens the number game's rules.
 */
export function NumberGameActions({ region }: { region: string }) {
  const t = useTranslations('games');
  const tCommon = useTranslations('common');
  const session = useSession();
  const [notice, setNotice] = useState<{ gate: LaunchGate; here: string } | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  return (
    <div className="ng-contest__actions">
      <LaunchButton
        provider="numbergame"
        label={t('numberGame.playNext')}
        ariaLabel={t('numberGame.playNext')}
        onActivate={() => {
          const gate = launchGate({
            provider: 'numbergame',
            mode: 'real',
            ready: session.ready,
            member: session.member,
            balanceMinor: session.balanceMinor,
          });
          if (gate) {
            setNotice({
              gate,
              here: `${window.location.pathname}${window.location.search}`,
            });
          }
        }}
      />
      <button type="button" className="btn btn-secondary" onClick={() => setRulesOpen(true)}>
        {t('numberGame.rulesButton')}
      </button>

      {notice ? (
        <LaunchGateModal
          gate={notice.gate}
          region={region}
          here={notice.here}
          onClose={() => setNotice(null)}
        />
      ) : null}

      <Modal
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        variant="rules"
        title={t('numberGame.rulesTitle')}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setRulesOpen(false)}>
            {tCommon('action.close')}
          </button>
        }
      >
        <p className="ng-rules__text">{t('numberGame.rules')}</p>
      </Modal>
    </div>
  );
}
