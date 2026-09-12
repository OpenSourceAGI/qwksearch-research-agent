'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Flexbox, Icon } from '@lobehub/ui';
import { ActionIcon, Text } from '@lobehub/ui/base-ui';
import { createStaticStyles, cssVar, cx } from 'antd-style';
import { GripVertical, X } from 'lucide-react';
import { memo, type ReactNode, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * The chosen values of an order-sensitive field, numbered and drag-sortable.
 *
 * Three fields across the two QwkSearch panes store a list whose order *is*
 * the behaviour: the extraction chain's `tiers` run in the order listed, the
 * search fan-out tries `categories` in the order listed and its per-search cap
 * keeps the first N, and `languages` is a transcript preference order. In all
 * three the order was previously invisible and unchangeable — a row of tags
 * says nothing about being a sequence, and the only way to promote the fourth
 * entry was to clear the field and re-pick everything.
 *
 * The numbers are the point. They are what tells the user the field has an
 * order at all; the drag handle is what lets them change it.
 */

export const ORDER_HANDLE_TEST_ID = 'qwk-ordered-handle';

/**
 * Move `activeId` to `overId`'s position. Pure, and the only ordering rule
 * here — a drag that lands on nothing, on itself, or on a value that is no
 * longer in the list leaves the list alone.
 */
export const moveItem = (value: readonly string[], activeId: string, overId: string): string[] => {
  const from = value.indexOf(activeId);
  const to = value.indexOf(overId);
  if (from === -1 || to === -1 || from === to) return [...value];
  return arrayMove([...value], from, to);
};

export const removeItem = (value: readonly string[], id: string): string[] =>
  value.filter((item) => item !== id);

const styles = createStaticStyles(({ css }) => ({
  index: css`
    flex-shrink: 0;

    inline-size: 18px;

    font-family: ${cssVar.fontFamilyCode};
    font-size: 12px;
    color: ${cssVar.colorTextQuaternary};
    text-align: end;
  `,
  row: css`
    padding-block: 4px;
    padding-inline: 6px;
    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: ${cssVar.borderRadius};

    background: ${cssVar.colorFillQuaternary};

    transition: background 0.2s ease-in-out;

    &:hover {
      background: ${cssVar.colorFillTertiary};
    }
  `,
  rowDragging: css`
    z-index: 1;
    background: ${cssVar.colorBgElevated};
    box-shadow: ${cssVar.boxShadowSecondary};
  `,
}));

interface SortableRowProps {
  id: string;
  label: ReactNode;
  onRemove: (id: string) => void;
  position: number;
  removeLabel: string;
}

const SortableRow = memo<SortableRowProps>(({ id, label, onRemove, position, removeLabel }) => {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  return (
    <Flexbox
      horizontal
      align={'center'}
      className={isDragging ? cx(styles.row, styles.rowDragging) : styles.row}
      gap={8}
      justify={'space-between'}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
    >
      <Flexbox horizontal align={'center'} gap={8}>
        <Flexbox
          data-testid={ORDER_HANDLE_TEST_ID}
          ref={setActivatorNodeRef}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', flexShrink: 0, touchAction: 'none' }}
          {...listeners}
        >
          <Icon icon={GripVertical} size={14} style={{ color: cssVar.colorTextQuaternary }} />
        </Flexbox>
        <span className={styles.index}>{position}</span>
        <Text>{label}</Text>
      </Flexbox>
      {/* `title` is the tooltip; the accessible name has to be said separately
          because the button's only content is an icon. */}
      <ActionIcon
        aria-label={removeLabel}
        icon={X}
        size={'small'}
        title={removeLabel}
        onClick={() => onRemove(id)}
      />
    </Flexbox>
  );
});

SortableRow.displayName = 'SortableRow';

export interface OrderedListProps {
  /** How to render a value. Defaults to the value itself. */
  labelFor?: (value: string) => ReactNode;
  onChange: (value: string[]) => void;
  value: readonly string[];
}

const OrderedList = memo<OrderedListProps>(({ labelFor, onChange, value }) => {
  const { t } = useTranslation('qwksearch');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over) return;
      const next = moveItem(value, String(active.id), String(over.id));
      if (next.some((item, index) => item !== value[index])) onChange(next);
    },
    [onChange, value],
  );

  const handleRemove = useCallback(
    (id: string) => onChange(removeItem(value, id)),
    [onChange, value],
  );

  const items = useMemo(() => [...value], [value]);

  if (items.length === 0) return null;

  return (
    <Flexbox gap={items.length > 1 ? 8 : 4}>
      {/* One value has no order to show, so the hint would be a lie. The rows
          still render, because removing is done there. */}
      {items.length > 1 && (
        <Text style={{ fontSize: 12 }} type={'secondary'}>
          {t('controls.order.hint')}
        </Text>
      )}
      <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <Flexbox gap={4}>
            {items.map((item, index) => (
              <SortableRow
                id={item}
                key={item}
                label={labelFor?.(item) ?? item}
                position={index + 1}
                removeLabel={t('controls.order.remove')}
                onRemove={handleRemove}
              />
            ))}
          </Flexbox>
        </SortableContext>
      </DndContext>
    </Flexbox>
  );
});

OrderedList.displayName = 'OrderedList';

export default OrderedList;
