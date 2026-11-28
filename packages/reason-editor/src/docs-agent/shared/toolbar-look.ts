/**
 * The toolbar's look, shared by `ReasonToolbar` and the Plate playground
 * toolbar so the two stay visually identical.
 *
 * Both render shadcn's `Button` (`@/app-ui/button`, `ghost` variant) and layer
 * these classes on top: one icon size and stroke, rounded corners, and distinct
 * hover, pressed, open and keyboard-focus states drawn from theme tokens, so
 * contrast holds in light and dark mode without per-theme colours.
 */

import { cn } from '@/lib/utils';

export type ToolbarButtonSize = 'default' | 'sm' | 'lg';

/** Every toolbar icon is 16px with a 1.75 stroke, whatever the icon set. */
const ICONS = "[&_svg:not([class*='size-'])]:size-4 [&_svg]:stroke-[1.75]";

const SIZES: Record<ToolbarButtonSize, string> = {
  sm: 'h-8 min-w-8 px-1.5 has-[>svg]:px-1.5',
  default: 'h-9 min-w-9 px-2 has-[>svg]:px-2',
  lg: 'h-10 min-w-10 px-2.5 has-[>svg]:px-2.5',
};

/**
 * `pressed` covers the three ways a control reports it: `aria-pressed` (plain
 * toggles), `aria-checked` (Radix toolbar toggle items) and `data-state=on`.
 * `data-state=open` is a menu trigger whose menu is showing.
 */
export function toolbarButtonClass(size: ToolbarButtonSize = 'sm', className?: string) {
  return cn(
    'rounded-lg font-normal text-muted-foreground shadow-none',
    'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent',
    'active:scale-95 active:bg-accent/70',
    'focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-ring/70',
    'aria-pressed:bg-primary/10 aria-pressed:text-primary aria-pressed:ring-1 aria-pressed:ring-inset aria-pressed:ring-primary/25',
    'aria-checked:bg-primary/10 aria-checked:text-primary aria-checked:ring-1 aria-checked:ring-inset aria-checked:ring-primary/25',
    'data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=on]:ring-1 data-[state=on]:ring-inset data-[state=on]:ring-primary/25',
    'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
    'disabled:opacity-40',
    ICONS,
    SIZES[size],
    className,
  );
}

/** The thin rule between button groups. */
export const TOOLBAR_SEPARATOR_CLASS = 'mx-1.5 h-5 w-px shrink-0 self-center bg-border';

/** The strip the buttons sit on. */
export const TOOLBAR_ROW_CLASS =
  'flex flex-wrap items-center gap-0.5 border-b border-border bg-background px-2 py-1.5';
