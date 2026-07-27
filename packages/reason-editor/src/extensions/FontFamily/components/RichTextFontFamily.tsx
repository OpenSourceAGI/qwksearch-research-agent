/**
 * Toolbar control (React) for the FontFamily extension, which adds font-family selection. Renders the button and dispatches the matching editor command when activated.
 */

import React, { Fragment, useMemo } from 'react';

import {
  ActionMenuButton,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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
        <div className='richtext-w-16'>
          <ActionMenuButton
            disabled={disabled}
            icon={icon}
            title={title?.slice(0, 5).toUpperCase()}
            tooltip={tooltip}
            // tooltipOptions={tooltipOptions}
          />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent className='richtext-max-h-96 richtext-w-40 richtext-overflow-y-auto'>
        {items?.map((item: any, index: any) => {
          const style =
            item.default ? {} : { fontFamily: item.font };

          return (
            <Fragment key={`font-family-${index}`}>
              <DropdownMenuCheckboxItem checked={title === item.font} onClick={item.action}>
                <div className='richtext-ml-1 richtext-h-full' style={style}>
                  {item.font}
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
