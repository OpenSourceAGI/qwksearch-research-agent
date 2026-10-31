'use client';

import { createModal, useModalContext } from '@lobehub/ui/base-ui';
import { t } from 'i18next';

import GuestKeyForm from './GuestKeyForm';

const GuestKeyModalContent = ({ onSaved }: { onSaved?: () => void }) => {
  const { close } = useModalContext();

  return (
    <GuestKeyForm
      onSaved={() => {
        close();
        onSaved?.();
      }}
    />
  );
};

/**
 * Opens the key form in a modal. `onSaved` runs once a key is verified and
 * saved; `onDismiss` runs when the modal closes without one.
 */
export const createGuestKeyModal = (onSaved?: () => void, onDismiss?: () => void) => {
  let saved = false;

  return createModal({
    content: (
      <GuestKeyModalContent
        onSaved={() => {
          saved = true;
          onSaved?.();
        }}
      />
    ),
    footer: null,
    maskClosable: true,
    title: t('guestKey.title', { ns: 'qwksearch' }),
    width: 'min(92vw, 480px)',
    onOpenChange: (open) => {
      if (!open && !saved) onDismiss?.();
    },
  });
};
