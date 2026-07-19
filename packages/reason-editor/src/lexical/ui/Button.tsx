/**
 * @fileoverview A reusable button component used throughout the editor UI.
 */


import type { JSX } from 'react';

import './Button.css';

import * as React from 'react';
import { ReactNode } from 'react';

import joinClasses from '../utils/joinClasses';

/**
 * A standard button component with support for distinct sizes and disabled states.
 * @param {Object} props - Component props.
 * @param {string} [props['data-test-id']] - Optional ID for testing.
 * @param {ReactNode} props.children - Button content.
 * @param {string} [props.className] - Optional additional CSS classes.
 * @param {() => void} props.onClick - Click handler.
 * @param {boolean} [props.disabled] - Whether the button is disabled.
 * @param {boolean} [props.small] - Whether to use a smaller size.
 * @param {string} [props.title] - Tooltip and aria-label.
 * @returns {JSX.Element} The rendered button.
 */
export default function Button({
  'data-test-id': dataTestId,
  children,
  className,
  onClick,
  disabled,
  small,
  title,
}: {
  'data-test-id'?: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  small?: boolean;
  title?: string;
}): JSX.Element {
  return (
    <button
      disabled={disabled}
      className={joinClasses(
        'Button__root',
        disabled && 'Button__disabled',
        small && 'Button__small',
        className,
      )}
      onClick={onClick}
      title={title}
      aria-label={title}
      {...(dataTestId && { 'data-test-id': dataTestId })}>
      {children}
    </button>
  );
}
