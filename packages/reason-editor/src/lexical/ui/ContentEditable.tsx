
import type { JSX } from 'react';

import './ContentEditable.css';

import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import * as React from 'react';

type Props = {
  className?: string;
  placeholderClassName?: string;
  placeholder: string;
};

/**
 * A wrapper around the Lexical ContentEditable component with support for placeholders.
 */
export default function LexicalContentEditable({
  className,
  placeholder,
  placeholderClassName,
}: Props): JSX.Element {
  return (
    <ContentEditable
      className={className ?? 'ContentEditable__root'}
      aria-placeholder={placeholder}
      placeholder={
        <div className={placeholderClassName ?? 'ContentEditable__placeholder'}>
          {placeholder}
        </div>
      }
    />
  );
}
