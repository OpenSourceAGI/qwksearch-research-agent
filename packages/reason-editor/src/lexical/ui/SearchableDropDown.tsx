import type { JSX } from 'react';

import * as React from 'react';
import { ReactNode, useState, useMemo } from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Search } from 'lucide-react';

import { cn } from '../../lib/utils';
import Icon from './Icon';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';

/**
 * A single item within a searchable dropdown menu.
 */
export function SearchableDropDownItem({
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
      title={title}
      onSelect={(e) => {
        // Prevent dropdown from closing on click
        e.preventDefault();
      }}>
      {children}
    </DropdownMenuPrimitive.Item>
  );
}

/**
 * A searchable dropdown menu component based on Radix UI primitives with integrated search.
 */
export default function SearchableDropDown({
  disabled = false,
  buttonLabel,
  buttonAriaLabel,
  buttonClassName,
  buttonIconClassName,
  items,
  onSelect,
  stopCloseOnClickSelf,
  buttonIcon,
  maxHeight = 'max-h-[300px]',
  tooltip,
  placeholder = 'Search...',
  activeValue,
  buttonWidth,
  dropdownWidth,
}: {
  disabled?: boolean;
  buttonAriaLabel?: string;
  buttonClassName: string;
  buttonIconClassName?: string;
  buttonLabel?: string;
  items: Array<{ value: string; label: string }>;
  onSelect: (value: string) => void;
  stopCloseOnClickSelf?: boolean;
  buttonIcon?: ReactNode;
  maxHeight?: string;
  tooltip?: string;
  placeholder?: string;
  activeValue?: string;
  buttonWidth?: string;
  dropdownWidth?: string;
}): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase();
    return items.filter(item =>
      item.label.toLowerCase().includes(query) ||
      item.value.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const handleSelect = (value: string) => {
    onSelect(value);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchQuery('');
    }
  };

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
          'h-8 gap-0.5 px-1 shrink-0 bg-transparent border-0 cursor-pointer',
          buttonWidth,
        )}>
        <ButtonContent />
      </button>
    </DropdownMenuPrimitive.Trigger>
  );

  return (
    <DropdownMenuPrimitive.Root
      modal={!stopCloseOnClickSelf}
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
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
          className={cn(
            'dropdown-content z-50 min-w-[160px] overflow-hidden rounded-md border shadow-md',
            'bg-popover/80 backdrop-blur-md text-popover-foreground',
            dropdownWidth,
          )}
          sideOffset={4}
          align="start"
          onCloseAutoFocus={(e) => {
            // Prevent focus from moving when closing
            e.preventDefault();
          }}>
          {/* Search Input */}
          <div className="flex items-center border-b px-3 py-2 sticky top-0 bg-popover/90 backdrop-blur-md z-10">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-7 w-full rounded-md bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              onClick={(e) => {
                // Prevent dropdown from closing when clicking input
                e.stopPropagation();
              }}
              onKeyDown={(e) => {
                // Prevent dropdown from closing on keyboard interaction
                e.stopPropagation();
              }}
            />
          </div>

          {/* Scrollable Items List */}
          <div className={cn('overflow-y-auto p-1', maxHeight)}>
            {filteredItems.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            ) : (
              filteredItems.map((item) => (
                <SearchableDropDownItem
                  key={item.value}
                  className={cn(
                    'item',
                    activeValue === item.value && 'active dropdown-item-active'
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSelect(item.value);
                  }}>
                  <span className="text">{item.label}</span>
                </SearchableDropDownItem>
              ))
            )}
          </div>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
