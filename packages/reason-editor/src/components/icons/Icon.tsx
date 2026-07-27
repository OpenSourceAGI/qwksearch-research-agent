/**
 * Generic Icon component that looks up and renders an icon by its registered name. Used throughout the toolbar to render icons dynamically.
 */

import React from 'react';

import { icons } from '@/components';

export interface IconComponentProps {
  name: string;
  className?: string;
  onClick?: React.MouseEventHandler<SVGElement>;
}

function IconComponent(props: IconComponentProps) {
  const Icon = icons[props.name];

  return Icon ? (
    <Icon
      onClick={props?.onClick}
      className={`richtext-h-4 richtext-w-4 ${props?.className || ''}`}
    />
  ) : null;
}

export { IconComponent };
