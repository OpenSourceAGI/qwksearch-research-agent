/**
 * Toolbar button variant that opens a dropdown menu of related actions. Used where a single control needs to expose a group of choices, such as lists or alignment.
 */

import { Slot } from '@radix-ui/react-slot';
import React from 'react';

import { Button, Tooltip, TooltipContent, TooltipTrigger, icons } from '@/components';
import { TooltipShortcutKeys } from '@/components/TooltipShortcutKeys';

import type { ButtonViewReturnComponentProps } from '@/types';
import type { TooltipContentProps } from '@radix-ui/react-tooltip';

export interface ActionMenuButtonProps {
  /** Icon name to display */
  icon?: any;
  /** Button title text */
  title?: string;
  /** Tooltip text */
  tooltip?: string;
  /** Tooltip options */
  tooltipOptions?: TooltipContentProps;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Keyboard shortcut keys */
  shortcutKeys?: string[];
  /** Button color */
  color?: string;
  /** Click action handler */
  action?: ButtonViewReturnComponentProps['action'];
  /** Active state checker */
  isActive?: ButtonViewReturnComponentProps['isActive'];
  /** Whether to render as child */
  asChild?: boolean;
  dataState?: boolean;
}

const ActionMenuButton = React.forwardRef<HTMLButtonElement, ActionMenuButtonProps>(
  ({ asChild = false, tooltip, ...props }, ref) => {
    const Icon = icons[props.icon];
    const Comp = asChild ? Slot : Button;

    // `title` is the button's visible label, rendered below. It must not reach
    // the DOM as the `title` attribute: the browser would then draw its own
    // native tooltip on hover on top of — and offset from — the styled Radix
    // one, so every toolbar control showed two overlapping tooltips.
    const { title, ...buttonProps } = props;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Comp
            className='richtext-h-[32px] richtext-overflow-hidden richtext-py-0 richtext-px-1'
            data-state={props?.dataState ? 'on' : 'off'} // active background control
            disabled={props?.disabled}
            ref={ref}
            variant='ghost'
            {...buttonProps}
          >
            <div className='richtext-flex richtext-h-full richtext-items-center richtext-font-normal'>
              {title && (
                <div className='richtext-grow richtext-truncate richtext-text-left richtext-text-sm'>
                  {title}
                </div>
              )}

              {Icon && (
                <Icon className='richtext-ml-1 richtext-size-3 richtext-shrink-0 richtext-text-zinc-500' />
              )}
            </div>
          </Comp>
        </TooltipTrigger>

        {tooltip && (
          <TooltipContent {...props?.tooltipOptions} className='richtext-tooltip'>
            <div className='richtext-flex richtext-flex-col richtext-items-center richtext-text-center'>
              {tooltip && <div>{tooltip}</div>}

              <TooltipShortcutKeys shortcutKeys={props?.shortcutKeys} />

            </div>
          </TooltipContent>
        )}
      </Tooltip>
    );
  }
);

export { ActionMenuButton };
