'use client';

import { Flexbox } from '@lobehub/ui';
import { Alert, Button, InputPassword, Text, toast } from '@lobehub/ui/base-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  applyGuestKeyToAccount,
  removeGuestKeyFromAccount,
  useIsGuestSession,
} from './accountSync';
import {
  looksLikeOpenRouterKey,
  normalizeOpenRouterKey,
  OPENROUTER_KEYS_URL,
  verifyOpenRouterKey,
} from './openrouter';
import { guestOpenRouterSelectors, useGuestOpenRouterStore } from './store';

interface GuestKeyFormProps {
  onSaved?: () => void;
}

const GuestKeyForm = ({ onSaved }: GuestKeyFormProps) => {
  const { t } = useTranslation('qwksearch');
  const [hasKey, maskedKey, setKey, clearKey] = useGuestOpenRouterStore((s) => [
    guestOpenRouterSelectors.hasKey(s),
    guestOpenRouterSelectors.maskedKey(s),
    s.setKey,
    s.clearKey,
  ]);
  // A guest session also hands the key to the main LobeHub chat.
  const isGuestSession = useIsGuestSession();

  const [value, setValue] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string>();

  const save = async () => {
    const key = normalizeOpenRouterKey(value);
    if (!looksLikeOpenRouterKey(key)) {
      setError(t('guestKey.error.format'));
      return;
    }

    setVerifying(true);
    setError(undefined);
    try {
      await verifyOpenRouterKey(key);
    } catch (e) {
      setError(t('guestKey.error.rejected', { message: (e as Error).message }));
      setVerifying(false);
      return;
    }

    setKey(key);
    setValue('');
    try {
      if (isGuestSession) await applyGuestKeyToAccount(key);
    } catch (e) {
      // The key is saved in this browser and the guest chat can use it; only
      // the main chat missed it (usually because the server is unreachable),
      // so say so without holding up whatever was waiting on the key.
      toast.error(t('guestKey.error.account', { message: (e as Error).message }));
    } finally {
      setVerifying(false);
    }
    onSaved?.();
  };

  return (
    <Flexbox gap={12}>
      <Text type={'secondary'}>{t('guestKey.description')}</Text>

      {hasKey && (
        <Flexbox horizontal align={'center'} gap={8} justify={'space-between'}>
          <Text>{t('guestKey.current', { key: maskedKey })}</Text>
          <Button
            danger
            size={'small'}
            onClick={() => {
              clearKey();
              if (isGuestSession) void removeGuestKeyFromAccount().catch(console.error);
            }}
          >
            {t('guestKey.actions.remove')}
          </Button>
        </Flexbox>
      )}

      <InputPassword
        autoComplete={'off'}
        placeholder={'sk-or-v1-…'}
        value={value}
        onPressEnter={save}
        onChange={(e) => {
          setValue(e.target.value);
          setError(undefined);
        }}
      />

      {error && <Alert showIcon title={error} type={'error'} />}

      <Flexbox horizontal align={'center'} gap={8} justify={'space-between'}>
        <a href={OPENROUTER_KEYS_URL} rel={'noreferrer'} target={'_blank'}>
          {t('guestKey.getKey')}
        </a>
        <Button disabled={!value.trim()} loading={verifying} type={'primary'} onClick={save}>
          {hasKey ? t('guestKey.actions.replace') : t('guestKey.actions.save')}
        </Button>
      </Flexbox>

      <Text fontSize={12} type={'secondary'}>
        {isGuestSession ? t('guestKey.privacyAccount') : t('guestKey.privacy')}
      </Text>
    </Flexbox>
  );
};

export default GuestKeyForm;
