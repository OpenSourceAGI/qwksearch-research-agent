
import type { JSX } from 'react';

import './FlashMessage.css';

import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface FlashMessageProps {
  children: ReactNode;
}

/**
 * A flash message component that renders in a portal at the bottom of the screen.
 */
export default function FlashMessage({
  children,
}: FlashMessageProps): JSX.Element {
  return createPortal(
    <div className="FlashMessage__overlay" role="dialog">
      <p className="FlashMessage__alert" role="alert">
        {children}
      </p>
    </div>,
    document.body,
  );
}
