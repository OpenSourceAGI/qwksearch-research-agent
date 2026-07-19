/**
 * @fileoverview Utility functions for managing the DOM state of collapsible nodes.
 */

export function setDomHiddenUntilFound(dom: HTMLElement): void {
  // @ts-expect-error
  dom.hidden = "until-found";
}

export function domOnBeforeMatch(dom: HTMLElement, callback: () => void): void {
  dom.onbeforematch = callback;
}
