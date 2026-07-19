
import type { JSX } from 'react';

import * as React from 'react';
import { ReactNode } from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';

import { cn } from '../../lib/utils';
import Icon from './Icon';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';

/**
 * A single item within a dropdown menu.
 */
export function DropDownItem({
  children,
  className,
  onClick,
  title,
}: {
  children: React.ReactNode;
  className: string;
  onClick: (event: React.MouseEvent) => void;
  title?: string;
}) {
  const isActive = className.includes('active') || className.includes('dropdown-item-active');

  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
        'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        isActive && 'bg-accent/50',
        className.includes('wide') && 'justify-between min-w-[220px]',
      )}
      onClick={onClick}
      title={title}>
      {children}
    </DropdownMenuPrimitive.Item>
  );
}

export function DropDownSeparator() {
  return <DropdownMenuPrimitive.Separator className="-mx-1 my-1 h-px bg-border" />;
}

/**
 * A section label/heading inside a dropdown menu.
 */
export function DropDownLabel({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenuPrimitive.Label className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      {children}
    </DropdownMenuPrimitive.Label>
  );
}

/**
 * A reusable dropdown menu component based on Radix UI primitives.
 */
export default function DropDown({
  disabled = false,
  buttonLabel,
  buttonAriaLabel,
  buttonClassName,
  buttonIconClassName,
  children,
  stopCloseOnClickSelf,
  hideChevron,
  buttonIcon,
  maxHeight,
  tooltip,
  open,
  onOpenChange,
}: {
  disabled?: boolean;
  buttonAriaLabel?: string;
  buttonClassName: string;
  buttonIconClassName?: string;
  buttonLabel?: string;
  children: ReactNode;
  stopCloseOnClickSelf?: boolean;
  hideChevron?: boolean;
  buttonIcon?: ReactNode;
  maxHeight?: string;
  tooltip?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}): JSX.Element {
  const ButtonContent = () => (
    <>
      {buttonIconClassName && (() => {
        const classes = buttonIconClassName.replace(/^icon\s+/, '').split(' ').filter(c => c && c !== 'block-type');
        const iconName = classes[classes.length - 1];
        return iconName ? <Icon name={iconName} /> : null;
      })()}
      {buttonIcon}
      {buttonLabel && (
        <span className="text-sm truncate max-w-[80px]">{buttonLabel}</span>
      )}
    </>
  );

  const dropdownTrigger = (
    <DropdownMenuPrimitive.Trigger asChild>
      <button
        type="button"
        disabled={disabled}
        aria-label={buttonAriaLabel || buttonLabel}
        className={cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
          'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:pointer-events-none disabled:opacity-50',
          'h-8 gap-0.5 px-1 shrink-0 border-0 cursor-pointer',
        )}>
        <ButtonContent />
      </button>
    </DropdownMenuPrimitive.Trigger>
  );

  return (
    <DropdownMenuPrimitive.Root modal={false} open={open} onOpenChange={onOpenChange}>
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {dropdownTrigger}
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      ) : (
        dropdownTrigger
      )}

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          style={{
            backgroundColor: 'hsl(var(--popover) / 1)',
            color: 'hsl(var(--popover-foreground) / 1)',
            borderColor: 'hsl(var(--border) / 1)',
          }}
          className={cn(
            'dropdown-content z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
            maxHeight || 'max-h-[min(50vh,var(--radix-dropdown-menu-content-available-height))]',
            'overflow-y-auto',
          )}
          sideOffset={4}
          align="start"
          onCloseAutoFocus={(e) => {
            if (stopCloseOnClickSelf) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            if (stopCloseOnClickSelf) {
              const target = e.target as HTMLElement;
              if (target.closest('.dropdown-content') || target.closest('.color-picker-wrapper')) {
                e.preventDefault();
              }
            }
          }}
          onPointerDownOutside={(e) => {
            if (stopCloseOnClickSelf) {
              const target = e.target as HTMLElement;
              if (target.closest('.dropdown-content') || target.closest('.color-picker-wrapper')) {
                e.preventDefault();
              }
            }
          }}
          onFocusOutside={(e) => {
            if (stopCloseOnClickSelf) {
              const target = e.target as HTMLElement;
              if (target.closest('.dropdown-content') || target.closest('.color-picker-wrapper')) {
                e.preventDefault();
              }
            }
          }}>
          {children}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
