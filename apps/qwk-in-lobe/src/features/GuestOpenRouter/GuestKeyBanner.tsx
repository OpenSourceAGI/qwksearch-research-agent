'use client';

import { Flexbox } from '@lobehub/ui';
import { Button, Text } from '@lobehub/ui/base-ui';
import { createStaticStyles } from 'antd-style';
import { KeyRoundIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useServerConfigStore } from '@/store/serverConfig';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';

import { createGuestKeyModal } from './createGuestKeyModal';
import { guestOpenRouterSelectors, useGuestOpenRouterStore } from './store';

const styles = createStaticStyles(({ css, cssVar }) => ({
  banner: css`
    padding-block: 12px;
    padding-inline: 16px;
    border: 1px solid ${cssVar.colorWarningBorder};
    border-radius: ${cssVar.borderRadiusLG};
    background: ${cssVar.colorWarningBg};
  `,
}));

/**
 * There are no accounts: each visitor is a guest user. Chatting needs an
 * OpenRouter key unless the deployment has one; this banner asks for one and
 * lets the visitor manage it once it is set. The chat itself is the home input
 * below it.
 */
const GuestKeyBanner = () => {
  const { t } = useTranslation('qwksearch');
  const isLoaded = useUserStore(authSelectors.isLoaded);
  const hasKey = useGuestOpenRouterStore(guestOpenRouterSelectors.hasKey);
  const deploymentHasKey = useServerConfigStore((s) => !!s.serverConfig.hasServerOpenRouterKey);

  // Nothing to ask for when the deployment's own key already answers chats.
  if (!isLoaded || (deploymentHasKey && !hasKey)) return null;

  return (
    <Flexbox
      horizontal
      align={'center'}
      className={styles.banner}
      gap={12}
      justify={'space-between'}
      wrap={'wrap'}
    >
      <Flexbox horizontal align={'center'} gap={10}>
        <KeyRoundIcon size={18} />
        <Text>{hasKey ? t('guestKey.banner.ready') : t('guestKey.banner.missing')}</Text>
      </Flexbox>
      <Flexbox horizontal gap={8}>
        {hasKey ? (
          <Button size={'small'} onClick={() => createGuestKeyModal()}>
            {t('guestKey.actions.manage')}
          </Button>
        ) : (
          <Button size={'small'} type={'primary'} onClick={() => createGuestKeyModal()}>
            {t('guestKey.actions.add')}
          </Button>
        )}
      </Flexbox>
    </Flexbox>
  );
};

export default GuestKeyBanner;
