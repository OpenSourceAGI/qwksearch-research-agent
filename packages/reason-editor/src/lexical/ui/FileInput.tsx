
import type { JSX } from 'react';

import './Input.css';

import * as React from 'react';

type Props = Readonly<{
  'data-test-id'?: string;
  accept?: string;
  label: string;
  onChange: (files: FileList | null) => void;
}>;

/**
 * A styled file input component.
 */
export default function FileInput({
  accept,
  label,
  onChange,
  'data-test-id': dataTestId,
}: Props): JSX.Element {
  return (
    <div className="Input__wrapper">
      <label className="Input__label">{label}</label>
      <input
        type="file"
        accept={accept}
        className="Input__input"
        onChange={(e) => onChange(e.target.files)}
        data-test-id={dataTestId}
      />
    </div>
  );
}
