
import type { JSX } from 'react';

import './Dialog.css';

import * as React from 'react';
import { ReactNode } from 'react';

type Props = Readonly<{
  'data-test-id'?: string;
  children: ReactNode;
}>;

/**
 * A container for a list of buttons in a dialog.
 */
export function DialogButtonsList({ children }: Props): JSX.Element {
  return <div className="DialogButtonsList">{children}</div>;
}

/**
 * A container for action buttons in a dialog footer.
 */
export function DialogActions({
  'data-test-id': dataTestId,
  children,
}: Props): JSX.Element {
  return (
    <div className="DialogActions" data-test-id={dataTestId}>
      {children}
    </div>
  );
}
