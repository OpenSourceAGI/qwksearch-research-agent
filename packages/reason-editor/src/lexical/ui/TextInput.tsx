/**
 * @fileoverview A reusable labeled text input component.
 */


import type { JSX } from 'react';

import './Input.css';

import * as React from 'react';
import { HTMLInputTypeAttribute } from 'react';

type Props = Readonly<{
  'data-test-id'?: string;
  label: string;
  onChange: (val: string) => void;
  placeholder?: string;
  value: string;
  type?: HTMLInputTypeAttribute;
}>;

/**
 * A simple labeled text input component.
 * @param {Object} props - Component props.
 * @param {string} props.label - Label text for the input.
 * @param {string} props.value - Current input value.
 * @param {(val: string) => void} props.onChange - Value change handler.
 * @param {string} [props.placeholder=''] - Placeholder text.
 * @param {string} [props['data-test-id']] - Optional ID for testing.
 * @param {HTMLInputTypeAttribute} [props.type='text'] - HTML input type.
 * @returns {JSX.Element} The rendered text input.
 */
export default function TextInput({
  label,
  value,
  onChange,
  placeholder = '',
  'data-test-id': dataTestId,
  type = 'text',
}: Props): JSX.Element {
  return (
    <div className="Input__wrapper">
      <label className="Input__label">{label}</label>
      <input
        type={type}
        className="Input__input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        data-test-id={dataTestId}
      />
    </div>
  );
}
