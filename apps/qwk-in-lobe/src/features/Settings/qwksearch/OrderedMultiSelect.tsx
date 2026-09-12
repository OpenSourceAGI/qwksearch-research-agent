'use client';

import { Flexbox } from '@lobehub/ui';
import { Select } from '@lobehub/ui/base-ui';
import { memo, type ReactNode, useCallback, useMemo } from 'react';

import OrderedList from './OrderedList';

/**
 * A multi-select over a closed option set whose chosen values can be ordered.
 *
 * The Select stays as the way to add and remove; the values are mirrored
 * underneath as {@link OrderedList}, which is where the order becomes visible
 * and changeable. Used for the extraction chain's `tiers` and the search
 * fan-out's `categories` — both closed sets the server publishes in `options`.
 */

export interface OrderedMultiSelectProps {
  /** Supplied by antd `Form.Item`. */
  onChange?: (value: string[]) => void;
  options: Array<{ label: ReactNode; value: string }>;
  placeholder?: string;
  /** Supplied by antd `Form.Item`. Empty means "inherit", never "none". */
  value?: string[];
}

const OrderedMultiSelect = memo<OrderedMultiSelectProps>(
  ({ onChange, options, placeholder, value }) => {
    const selected = useMemo(() => value ?? [], [value]);

    const labels = useMemo(
      () => new Map(options.map((option) => [option.value, option.label])),
      [options],
    );

    // base-ui's Select types its value as `T | T[] | null | undefined` even in
    // multiple mode, and hands the matched options as a second argument that
    // antd's `Form.Item` would otherwise pass straight through.
    const handleSelect = useCallback(
      (next: string | string[] | null | undefined) => onChange?.(Array.isArray(next) ? next : []),
      [onChange],
    );

    const handleOrder = useCallback((next: string[]) => onChange?.(next), [onChange]);

    const labelFor = useCallback(
      // A value the current options do not describe still gets a row: the
      // server may enable a tier this build has no label for, and a numbered
      // blank is worse than a raw id.
      (item: string): ReactNode => labels.get(item) ?? item,
      [labels],
    );

    return (
      <Flexbox gap={8}>
        <Select
          mode={'multiple'}
          options={options}
          placeholder={placeholder}
          value={selected}
          onChange={handleSelect}
        />
        <OrderedList labelFor={labelFor} value={selected} onChange={handleOrder} />
      </Flexbox>
    );
  },
);

OrderedMultiSelect.displayName = 'OrderedMultiSelect';

export default OrderedMultiSelect;
