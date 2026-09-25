
// Stopping propagation isolates the page, but does not cancel Chromium's
// bare-Alt menu focus. Cancel both halves, including release after Alt+Q opens us.
export function installAltKeyGuard(target) {
  const guard = event => {
    if (event.key === 'Alt' && !event.ctrlKey && !event.metaKey &&
        !event.getModifierState?.('AltGraph')) event.preventDefault();
  };
  const options = { capture: true };
  target.addEventListener('keydown', guard, options);
  target.addEventListener('keyup', guard, options);
  return () => {
    target.removeEventListener('keydown', guard, options);
    target.removeEventListener('keyup', guard, options);
  };
}
