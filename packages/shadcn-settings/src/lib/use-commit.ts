import * as React from "react";
import type { SettingsValue } from "../types";

/**
 * Wraps an `onCommit` callback with a `committing` flag so field controls can
 * show a spinner / disable themselves while an async save is in flight. Safe
 * against unmounts and tolerant of a synchronous (void) callback.
 */
export function useCommit(
  onCommit?: (value: SettingsValue) => void | Promise<void>,
) {
  const [committing, setCommitting] = React.useState(false);
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const commit = React.useCallback(
    async (value: SettingsValue) => {
      if (!onCommit) return;
      setCommitting(true);
      try {
        await onCommit(value);
      } finally {
        // Brief floor so very fast saves still register visually, matching the
        // original settings UI behaviour.
        window.setTimeout(() => {
          if (mounted.current) setCommitting(false);
        }, 150);
      }
    },
    [onCommit],
  );

  return { committing, commit };
}
