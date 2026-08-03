/**
 * Toolbar control (React) for the FontFamily extension, which adds font-family selection. Renders the button and dispatches the matching editor command when activated.
 */

import React, { Fragment, useMemo } from 'react';

import {
  ActionMenuButton,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components';
import { FontFamily } from '@/extensions/FontFamily/FontFamily';
import { useActive } from '@/hooks/useActive';
import { useButtonProps } from '@/hooks/useButtonProps';
import { useLocale } from '@/locales';

import type { ButtonViewReturnComponentProps } from '@/types';

export interface Item {
  title: string;
  icon?: any;
  font?: string;
  isActive: NonNullable<ButtonViewReturnComponentProps['isActive']>;
  action?: ButtonViewReturnComponentProps['action'];
  style?: React.CSSProperties;
  shortcutKeys?: string[];
  disabled?: boolean;
  divider?: boolean;
  default?: boolean;
}

export function RichTextFontFamily() {
  const { t } = useLocale();

  const buttonProps = useButtonProps(FontFamily.name);

  const {
    icon = undefined,
    tooltip = undefined,
    items = [],
    isActive = undefined,
  } = buttonProps?.componentProps ?? {};

  const { disabled, dataState } = useActive(isActive);

  const title = useMemo(() => {
    return dataState?.font || 'Inter';
  }, [dataState]);

  if (!buttonProps) {
    return <></>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <div className='richtext-w-full'>
          <ActionMenuButton
            disabled={disabled}
            icon={icon}
            title={title}
            tooltip={tooltip}
            // tooltipOptions={tooltipOptions}
          />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent className='richtext-max-h-96 richtext-w-56 richtext-overflow-y-auto'>
        <DropdownMenuLabel className='richtext-text-xs richtext-text-muted-foreground'>
          Font Family
        </DropdownMenuLabel>
        {items?.map((item: any, index: any) => {
          const style =
            item.default ? {} : { fontFamily: item.font };

          return (
            <Fragment key={`font-family-${index}`}>
              <DropdownMenuCheckboxItem checked={title === item.font} onClick={item.action}>
                <div className='richtext-truncate' style={style}>
                  {item.title}
                </div>
              </DropdownMenuCheckboxItem>

              {item.default && <DropdownMenuSeparator />}
            </Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
