/**
 * The REASON toolbar's look, expressed as classes that can be dropped on the
 * `FixedToolbar` container of Plate registry toolbar buttons.
 *
 * The buttons themselves are shadcn `Button`s (`./toolbar.tsx` renders every
 * control through `@/app-ui/button`) styled by `shared/toolbar-look.ts`, the
 * same classes `shared/toolbar-renderer.tsx` uses — so the two toolbars share
 * one set of hover, pressed, open and focus states. What is left for the skin is
 * the strip the buttons sit on, and the `FixedToolbar` shell's own defaults it
 * has to override.
 */

import { cn } from '@/lib/utils';
import { TOOLBAR_ROW_CLASS } from '@/docs-agent/shared/toolbar-look';

/** Container: the same row `ReasonToolbar` renders. */
const container = cn(
  TOOLBAR_ROW_CLASS,
  'w-full justify-start',
  // `FixedToolbar` sets `border-b-border` and a translucent backdrop of its own;
  // the explicit side keeps tailwind-merge from dropping this class.
  'border-b border-b-border bg-background/95 backdrop-blur-sm',
);

/**
 * Icons and rules. `:not([data-icon])` spares the dropdown chevrons, which the
 * registry sizes at `size-3.5` and tags with `data-icon`.
 */
const chrome = cn('[&_svg:not([data-icon])]:size-4');

export const REASON_TOOLBAR_SKIN = cn(container, chrome);
