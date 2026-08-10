/**
 * Toolbar control (React) for the History extension, which adds undo/redo history. Renders the button and dispatches the matching editor command when activated.
 */

import React from 'react';

import { ActionButton, icons } from '@/components';
import { History } from '@/extensions/History/History';
import { useActive } from '@/hooks/useActive';
import { useButtonProps } from '@/hooks/useButtonProps';

export interface RichTextHistoryProps {
  /**
   * Render nothing while the command is unavailable instead of showing a
   * greyed-out button — used by the main toolbar so undo/redo only appear
   * once there is something to undo or redo.
   */
  hideWhenDisabled?: boolean;
}

export function RichTextUndo({ hideWhenDisabled }: RichTextHistoryProps = {}) {
  const buttonProps = useButtonProps(History.name);

  const {
    icon = undefined,
    tooltip = undefined,
    shortcutKeys = undefined,
    tooltipOptions = {},
    action = undefined,
    isActive = undefined,
  } = buttonProps?.componentProps?.undo ?? {};

  const { disabled } = useActive(isActive);

  const Icon = icons[icon as string];

  const onAction = () => {
    if (disabled) return;

    if (action) action();
  };

  if (!buttonProps || !Icon) {
    return <></>;
  }

  if (hideWhenDisabled && disabled) {
    return <></>;
  }

  return (
    <ActionButton
      action={onAction}
      disabled={disabled}
      icon={icon}
      shortcutKeys={shortcutKeys}
      tooltip={tooltip}
      tooltipOptions={tooltipOptions}
    />
  );
}

export function RichTextRedo({ hideWhenDisabled }: RichTextHistoryProps = {}) {
  const buttonProps = useButtonProps(History.name);

  const {
    icon = undefined,
    tooltip = undefined,
    shortcutKeys = undefined,
    tooltipOptions = {},
    action = undefined,
    isActive = undefined,
  } = buttonProps?.componentProps?.redo ?? {};

  const { disabled } = useActive(isActive);

  const onAction = () => {
    if (disabled) return;

    if (action) action();
  };

  if (!buttonProps) {
    return <></>;
  }

  if (hideWhenDisabled && disabled) {
    return <></>;
  }

  return (
    <ActionButton
      action={onAction}
      disabled={disabled}
      icon={icon}
      shortcutKeys={shortcutKeys}
      tooltip={tooltip}
      tooltipOptions={tooltipOptions}
    />
  );
}
