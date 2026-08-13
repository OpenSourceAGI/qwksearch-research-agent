/**
 * @module use-mobile
 * @description React hook that tracks whether the current viewport matches the
 * mobile breakpoint, updating reactively on window resize.
 */
import * as React from "react";

/** Maximum viewport width (px) considered a mobile device — viewports below this threshold are mobile. */
const MOBILE_BREAKPOINT = 1024;

/**
 * Returns `true` when the viewport width is below {@link MOBILE_BREAKPOINT}.
 * Subscribes to `window.matchMedia` so it updates automatically on resize.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
