/**
 * The rules that keep a toolbar dropdown — and everything it opens on top of
 * itself — alive while the user is working in it.
 *
 * The toolbar's panels are portals of our own. The controls inside them open
 * Radix popovers, menus, selects and dialogs, and Radix renders those in *its*
 * own portals attached to `<body>`: outside the panel in the DOM, though still
 * children of it in the React tree. So a naive "did the click land inside the
 * panel element?" test reads every click on a colour swatch, a font name or a
 * dialog field as being outside, closes the panel, and unmounts the surface the
 * click landed in. These helpers answer that question in terms of the whole
 * stack of surfaces instead of one element, and are kept apart from `Toolbar`
 * itself so they can be tested without the extension graph it pulls in.
 */

/** Every surface a toolbar panel can put on screen, including the panels. */
export const OVERLAY_SELECTOR = [
  '.dropdown-container',
  '.dropdown-portal',
  // The marker this package's UI primitives stamp on their portalled content.
  '[data-richtext-portal]',
  '[data-radix-popper-content-wrapper]',
  '[data-radix-portal]',
  // Roles cover anything unstamped: Radix gives dialogs and popovers
  // `role="dialog"`, menus `role="menu"` and selects `role="listbox"`.
  '[role="dialog"]',
  '[role="menu"]',
  '[role="listbox"]',
].join(',');

/**
 * The subset that exists in the DOM only while a nested layer is open — Radix
 * unmounts its content on close — so its presence answers "is something open on
 * top of the panel right now?".
 */
export const NESTED_LAYER_SELECTOR = '[role="dialog"],[role="menu"],[role="listbox"]';

/** Controls that legitimately need the caret, so must keep their native focus. */
const TEXT_ENTRY_SELECTOR = 'input, textarea, select, [contenteditable="true"], [role="textbox"]';

const CLICKABLE_SELECTOR =
  'button, [role="button"], [role="menuitem"], [role="menuitemcheckbox"]';

/**
 * Whether a press at `target` should close the open toolbar panel.
 *
 * @param root the document the panel lives in, used to look for open layers
 */
export function shouldDismissPanel(
  target: EventTarget | null,
  root: Document = document,
): boolean {
  const element = target as HTMLElement | null;

  // A control that re-renders on press reports a target already detached from
  // the document, which matches no selector. That is not "outside".
  if (!element?.isConnected) return false;

  if (element.closest(OVERLAY_SELECTOR)) return false;

  // A nested dialog/menu/popover is open on top of the panel, so this press
  // belongs to that layer's own dismissal, not ours. The panel has to stay
  // mounted: it owns the React tree the layer is rendered from, and closing it
  // here would take the layer down mid-interaction.
  if (root.querySelector(NESTED_LAYER_SELECTOR)) return false;

  return true;
}

/**
 * Whether pressing `target` should be stopped from moving focus.
 *
 * Pressing a toolbar control must not pull focus out of the document, or the
 * command it fires has no selection left to act on — which is why formatting a
 * selection from inside a menu used to clear it. Text fields and non-button
 * targets (a panel's own scrollbar, for one) are left alone.
 */
export function shouldKeepEditorFocus(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;

  if (!element?.closest) return false;
  if (element.closest(TEXT_ENTRY_SELECTOR)) return false;

  return !!element.closest(CLICKABLE_SELECTOR);
}
