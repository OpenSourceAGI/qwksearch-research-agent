/**
 * Reusable toolbar button with icon, tooltip, and shortcut display used by most extensions. Standardizes how toolbar actions look and behave across the editor.
 */

import { Slot } from '@radix-ui/react-slot';
import React from 'react';

import { Toggle, Tooltip, TooltipContent, TooltipTrigger, icons } from '@/components';
import { cn } from '@/lib/utils';
import { TooltipShortcutKeys } from '@/components/TooltipShortcutKeys';

import type { ButtonViewReturnComponentProps } from '@/types';
import type { TooltipContentProps } from '@radix-ui/react-tooltip';

export interface ActionButtonProps {
  /* Icon name to display */
  icon?: string;
  /* Button title */
  title?: string;
  /* Tooltip text */
  tooltip?: string;
  /* Whether the button is disabled */
  disabled?: boolean;
  /* Keyboard shortcut keys (the action's defaults; the live user binding is resolved from them) */
  shortcutKeys?: string[];
  /* Explicit shortcut-registry action id, when the default keys alone are ambiguous */
  shortcutId?: string;
  /* Custom CSS class */
  customClass?: string;
  /* Loading state */
  loading?: boolean;
  /* Tooltip options */
  tooltipOptions?: TooltipContentProps;
  /* Button color */
  color?: string;
  /* Click action handler */
  action?: ButtonViewReturnComponentProps['action'];
  /* Active state checker */
  isActive?: ButtonViewReturnComponentProps['isActive'];
  /* Child components */
  children?: React.ReactNode;
  /* Whether to render as child */
  asChild?: boolean;
  /* Whether it's an upload button */
  upload?: boolean;
  /* Initial displayed color */
  initialDisplayedColor?: string;

  dataState?: boolean;
}

const ActionButton = React.forwardRef<HTMLButtonElement, Partial<ActionButtonProps>>(
  (props, ref) => {
    const {
      icon = undefined,
      // Pulled out of `rest` so it never reaches the DOM as the `title`
      // attribute: the browser would draw its own native tooltip on hover,
      // overlapping and offset from the styled Radix one below.
      title: _title = undefined,
      tooltip = undefined,
      disabled = false,
      customClass = '',
      // color = undefined,
      loading: _loading = undefined,
      shortcutKeys = undefined,
      shortcutId = undefined,
      tooltipOptions = {},
      action = undefined,
      isActive: _isActive = undefined,
      children,
      asChild = false,
      upload: _upload = false,
      initialDisplayedColor: _initialDisplayedColor = undefined,
      dataState = false,
      ...rest
    } = props;

    const Icon = icons[icon as string];
    const Comp = asChild ? Slot : Toggle;

    const onClickHandler = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      if (disabled) {
        e.preventDefault();
        return;
      }
      action?.(e);
    };

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Comp
            className={cn('richtext-h-[32px] richtext-w-[32px]', customClass)}
            data-state={dataState ? 'on' : 'off'} // active background control
            disabled={disabled} // disable button control
            onClick={onClickHandler}
            ref={ref}
            size='sm'
            {...(rest as Omit<typeof rest, 'loading'>)}
          >
            {Icon && <Icon className='richtext-size-4' />}
            {children}
          </Comp>
        </TooltipTrigger>

        {tooltip && (
          <TooltipContent {...tooltipOptions} className='richtext-tooltip'>
            <div className='richtext-flex richtext-flex-col richtext-items-center richtext-text-center'>
              <div>{tooltip}</div>

              <TooltipShortcutKeys shortcutId={shortcutId} shortcutKeys={shortcutKeys} />
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    );
  }
);

export { ActionButton };
