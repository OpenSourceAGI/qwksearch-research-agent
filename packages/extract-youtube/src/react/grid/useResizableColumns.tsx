/**
 * @fileoverview Drag-to-resize state for a table's columns: a pixel width per
 * column key, driven by a handle's pointer-down and then document-level move
 * and up listeners (the drag leaves the handle almost immediately).
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export const MIN_COLUMN_WIDTH = 60;
export const MAX_COLUMN_WIDTH = 900;

export function useResizableColumns<K extends string>(defaultWidths: Record<K, number>) {
  const [widths, setWidths] = useState<Record<K, number>>(defaultWidths);
  const resizingKey = useRef<K | null>(null);
  const start = useRef({ x: 0, width: 0 });

  const startResize = useCallback(
    (key: K, clientX: number) => {
      resizingKey.current = key;
      start.current = { x: clientX, width: widths[key] ?? 120 };
      document.body.classList.add('eytg-resizing');
    },
    [widths],
  );

  const resetWidths = useCallback(() => setWidths(defaultWidths), [defaultWidths]);

  useEffect(() => {
    const apply = (clientX: number) => {
      const key = resizingKey.current;
      if (!key) return;
      const next = Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, start.current.width + clientX - start.current.x));
      setWidths((prev) => (prev[key] === next ? prev : { ...prev, [key]: next }));
    };
    const stop = () => {
      if (!resizingKey.current) return;
      resizingKey.current = null;
      document.body.classList.remove('eytg-resizing');
    };
    const onMouseMove = (event: MouseEvent) => apply(event.clientX);
    const onTouchMove = (event: TouchEvent) => {
      if (!resizingKey.current) return;
      apply(event.touches[0].clientX);
      // Stop the page from scrolling sideways under the drag.
      event.preventDefault();
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', stop);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', stop);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', stop);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', stop);
      document.body.classList.remove('eytg-resizing');
    };
  }, []);

  return { widths, startResize, resetWidths };
}

/** The drag strip on a header cell's right edge. Place it inside a `position: relative` cell. */
export function ColumnResizeHandle({ onResizeStart, label }: { onResizeStart: (clientX: number) => void; label?: string }) {
  return (
    <span
      className="eytg-resize"
      role="separator"
      aria-orientation="vertical"
      aria-label={label ? `Resize ${label} column` : 'Resize column'}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onResizeStart(event.clientX);
      }}
      onTouchStart={(event) => {
        event.stopPropagation();
        onResizeStart(event.touches[0].clientX);
      }}
      onClick={(event) => event.stopPropagation()}
    />
  );
}
