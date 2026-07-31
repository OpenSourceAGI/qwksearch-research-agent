/**
 * Wrapper that makes an entire dropdown row (icon + label) clickable and suppresses redundant tooltips. Used to render action buttons cleanly inside dropdown menus.
 */

import React, { cloneElement, isValidElement, useRef } from 'react';
import { cn } from '@/lib/utils';

interface DropdownMenuItemProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
  icon?: React.ReactNode;
  /** Keyboard shortcut hint shown at the end of the row, e.g. "Ctrl+Shift+8" */
  shortcut?: string;
}

/**
 * Wrapper for dropdown menu items that makes the entire row (icon + label) clickable
 * and suppresses the tooltip when a label is present
 */
export function ToolbarMenuItem({ children, label, className, icon, shortcut }: DropdownMenuItemProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);

  // Clone the child element (usually an ActionButton) and suppress its tooltip if we have a label
  const enhancedChild = isValidElement(children)
    ? cloneElement(children as React.ReactElement<any>, {
        tooltip: label ? undefined : (children as any).props?.tooltip,
        tooltipOptions: label ? undefined : (children as any).props?.tooltipOptions,
      })
    : children;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // If the click already landed on an interactive element let it handle itself
    if ((e.target as HTMLElement).closest('button, [role="button"], a')) return;
    const nestedButton = buttonRef.current?.querySelector('button');
    nestedButton?.click();
  };

  return (
    <div
      ref={buttonRef}
      className={cn(
        'flex items-center gap-2 px-2 py-0.5 rounded cursor-pointer w-full text-left',
        'hover:bg-gray-100/80 dark:hover:bg-slate-800/80',
        'transition-colors',
        className
      )}
      onClick={handleClick}
    >
      {icon && (
        <span className="w-5 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0">
          {icon}
        </span>
      )}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {enhancedChild}
        {label && <span className="text-xs whitespace-nowrap truncate">{label}</span>}
        {shortcut && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto whitespace-nowrap shrink-0">
            {shortcut}
          </span>
        )}
      </div>
    </div>
  );
}
