/**
 * Toolbar control (React) for the FontSize extension, which adds font-size selection. Renders the button and dispatches the matching editor command when activated.
 */

import React, { Fragment, useMemo, useState } from 'react';

import {
  ActionMenuButton,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components';
import { FontSize } from '@/extensions/FontSize/FontSize';
import { useActive } from '@/hooks/useActive';
import { useButtonProps } from '@/hooks/useButtonProps';
import { useLocale } from '@/locales';
import { Plus, Minus } from 'lucide-react';

import type { ButtonViewReturnComponentProps } from '@/types';

export interface Item {
  title: string;
  isActive: NonNullable<ButtonViewReturnComponentProps['isActive']>;
  action?: ButtonViewReturnComponentProps['action'];
  style?: React.CSSProperties;
  disabled?: boolean;
  divider?: boolean;
  default?: boolean;
}

export function RichTextFontSize() {
  const { t } = useLocale();
  const buttonProps = useButtonProps(FontSize.name);
  const [customSize, setCustomSize] = useState('');

  const {
    icon = undefined,
    tooltip = undefined,
    items = [],
    isActive = undefined,
  } = buttonProps?.componentProps ?? {};

  const { disabled, dataState } = useActive(isActive);

  const title = useMemo(() => {
    const size = (dataState as any)?.title || '16px';
    return size.replace('px', '');
  }, [dataState]);

  if (!buttonProps) {
    return <></>;
  }

  const handleCustomSize = (action: (size: string) => void) => {
    if (customSize && /^\d+$/.test(customSize)) {
      action(`${customSize}px`);
      setCustomSize('');
    }
  };

  const handleIncrement = () => {
    const current = parseInt(title) || 16;
    const item = items.find((i: Item) => i.title === `${current + 1}px`);
    if (item?.action) item.action();
  };

  const handleDecrement = () => {
    const current = parseInt(title) || 16;
    const item = items.find((i: Item) => i.title === `${current - 1}px`);
    if (item?.action) item.action();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <div className='richtext-w-12'>
          <ActionMenuButton
            disabled={disabled}
            icon={icon}
            title={title}
            tooltip={tooltip}
            // tooltipOptions={tooltipOptions}
          />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent className='richtext-max-h-96 richtext-w-40 richtext-overflow-y-auto'>
        <div className='richtext-flex richtext-items-center richtext-gap-1 richtext-px-2 richtext-py-2'>
          <button
            onClick={handleDecrement}
            disabled={disabled}
            className='richtext-p-1 richtext-rounded hover:richtext-bg-gray-100 dark:hover:richtext-bg-slate-700 disabled:richtext-opacity-50'
          >
            <Minus size={14} />
          </button>
          <input
            type='number'
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            placeholder='Custom'
            className='richtext-w-12 richtext-px-1.5 richtext-py-1 richtext-text-xs richtext-border richtext-rounded'
          />
          <button
            onClick={handleIncrement}
            disabled={disabled}
            className='richtext-p-1 richtext-rounded hover:richtext-bg-gray-100 dark:hover:richtext-bg-slate-700 disabled:richtext-opacity-50'
          >
            <Plus size={14} />
          </button>
        </div>
        <DropdownMenuSeparator />

        {items?.map((item: any, index: any) => {
          const displayTitle = item.title.replace('px', '');
          return (
            <Fragment key={`font-size-${index}`}>
              <DropdownMenuCheckboxItem checked={title === displayTitle} onClick={item.action}>
                <div className='richtext-ml-1 richtext-h-full'>{displayTitle}</div>
              </DropdownMenuCheckboxItem>

              {item.default && <DropdownMenuSeparator />}
            </Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
