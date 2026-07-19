/**
 * @fileoverview Plugin for managing hyperlinks in the Lexical editor.
 * Wraps the core LexicalLinkPlugin with custom URL validation and attributes.
 */


import type { JSX } from 'react';

import { LinkPlugin as LexicalLinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import * as React from 'react';

import { validateUrl } from '../../utils/url';

type Props = {
  hasLinkAttributes?: boolean;
};

/**
 * Plugin that enables link support with optional default attributes.
 * @param {Object} props - Component props.
 * @param {boolean} [props.hasLinkAttributes=false] - Whether to add default rel/target attributes to links.
 * @returns {JSX.Element} The rendered core LexicalLinkPlugin.
 */
export default function LinkPlugin({
  hasLinkAttributes = false,
}: Props): JSX.Element {
  return (
    <LexicalLinkPlugin
      validateUrl={validateUrl}
      attributes={
        hasLinkAttributes
          ? {
            rel: 'noopener noreferrer',
            target: '_blank',
          }
          : undefined
      }
    />
  );
}
