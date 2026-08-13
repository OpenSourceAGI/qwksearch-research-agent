import React, { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  /** Label shown on the trigger button (already formatted for the location). */
  label: string;
  /** The day the calendar opens on and highlights as "today". */
  today: Date;
  /** Currently selected day, if the user picked one. */
  selected?: Date;
  onSelect: (date: Date) => void;
  fontSize?: number;
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = Array.from({ length: 12 }, (_, month) =>
  new Date(2020, month, 1).toLocaleDateString([], { month: 'long' })
);

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

const popover: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  zIndex: 50,
  width: 224,
  padding: 8,
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  background: '#fff',
  color: '#111827',
  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  fontSize: 11,
};

const navButton: React.CSSProperties = {
  width: 20,
  height: 20,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  padding: 0,
  lineHeight: 1,
};

const select: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  background: '#fff',
  color: 'inherit',
  fontSize: 11,
  padding: '1px 3px',
  cursor: 'pointer',
};

const dayCell: React.CSSProperties = {
  height: 24,
  border: 'none',
  borderRadius: 6,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  fontSize: 11,
  padding: 0,
};

/**
 * A dependency-free date picker in the shadcn calendar style: a trigger showing
 * the current date, and a popover with month / year dropdowns for browsing, and
 * the location's current day highlighted.
 */
export function DateCalendar({ label, today, selected, onSelect, fontSize = 10 }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const rootRef = useRef<HTMLSpanElement>(null);

  // Reopening after the date rolls over should land back on the current month.
  useEffect(() => {
    if (open) setView(new Date((selected ?? today).getFullYear(), (selected ?? today).getMonth(), 1));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const years = useMemo(() => {
    const current = today.getFullYear();
    return Array.from({ length: 61 }, (_, index) => current - 50 + index);
  }, [today]);

  // Six weeks of cells, starting on the Sunday on or before the 1st, so the
  // grid height never jumps between months.
  const cells = useMemo(() => {
    const firstOfMonth = new Date(view.getFullYear(), view.getMonth(), 1);
    const start = new Date(firstOfMonth);
    start.setDate(1 - firstOfMonth.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [view]);

  const shiftMonth = (delta: number) => setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));

  return (
    <span ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Browse the calendar"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          font: 'inherit',
          fontSize,
          padding: 0,
          cursor: 'pointer',
          opacity: 0.75,
        }}
      >
        {label}
        <span aria-hidden style={{ fontSize: fontSize - 2 }}>▾</span>
      </button>

      {open && (
        <div role="dialog" aria-label="Calendar" style={popover}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" style={navButton}>
              ‹
            </button>
            <select
              value={view.getMonth()}
              onChange={(e) => setView(new Date(view.getFullYear(), Number(e.target.value), 1))}
              aria-label="Month"
              style={{ ...select, flex: 1 }}
            >
              {MONTHS.map((month, index) => (
                <option key={month} value={index}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={view.getFullYear()}
              onChange={(e) => setView(new Date(Number(e.target.value), view.getMonth(), 1))}
              aria-label="Year"
              style={select}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" style={navButton}>
              ›
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' }}>
            {WEEKDAYS.map((day) => (
              <span key={day} style={{ fontSize: 10, opacity: 0.55, paddingBottom: 2 }}>
                {day}
              </span>
            ))}
            {cells.map((date) => {
              const outside = date.getMonth() !== view.getMonth();
              const isToday = isSameDay(date, today);
              const isSelected = selected ? isSameDay(date, selected) : false;
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => {
                    onSelect(date);
                    setOpen(false);
                  }}
                  aria-current={isToday ? 'date' : undefined}
                  aria-pressed={isSelected}
                  style={{
                    ...dayCell,
                    opacity: outside ? 0.35 : 1,
                    fontWeight: isToday || isSelected ? 700 : 400,
                    background: isSelected ? '#111827' : isToday ? '#e5e7eb' : 'transparent',
                    color: isSelected ? '#fff' : 'inherit',
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </span>
  );
}
