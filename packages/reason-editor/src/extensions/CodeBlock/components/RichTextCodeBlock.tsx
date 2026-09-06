/**
 * Toolbar control (React) for the CodeBlock extension, which adds syntax-highlighted code blocks. Renders the button and dispatches the matching editor command when activated.
 */

import React from 'react';

import { ActionButton } from '@/components';
import { CodeBlock } from '@/extensions/CodeBlock/CodeBlock';
import { useToggleActive } from '@/hooks/useActive';
import { useButtonProps } from '@/hooks/useButtonProps';

export function RichTextCodeBlock() {
  const buttonProps = useButtonProps(CodeBlock.name);

  const {
    icon = undefined,
    tooltip = undefined,
    shortcutKeys = undefined,
    tooltipOptions = {},
    action = undefined,
    isActive = undefined,
  } = buttonProps?.componentProps ?? {};

  const { dataState, disabled, update } = useToggleActive(isActive);

  const onAction = () => {
    if (disabled) return;

    if (action) {
      action();
      update();
    }
  };

  if (!buttonProps) {
    return <></>;
  }

  return (
    <ActionButton
      action={onAction}
      dataState={dataState}
      disabled={disabled}
      icon={icon}
      shortcutKeys={shortcutKeys}
      tooltip={tooltip}
      tooltipOptions={tooltipOptions}
    />
  );
}
