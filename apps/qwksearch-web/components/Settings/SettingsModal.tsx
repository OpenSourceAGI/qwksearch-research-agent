'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { configureResearchAgentUI } from 'research-agent-ui';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import SettingsContent from './SettingsContent';

// Matches the Tailwind `lg` breakpoint that SettingsContent already uses for
// its two-column desktop layout; below this we navigate to the /settings route.
const DESKTOP_QUERY = '(min-width: 1024px)';

const isDesktop = () =>
  typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches;

interface SettingsModalContextValue {
  /**
   * Attempts to open settings in the modal. Returns `true` when handled (large
   * desktop screens) so the caller skips route navigation, or `false` when the
   * caller should fall back to navigating to `/settings` (small screens).
   */
  openSettings: (section?: string) => boolean;
  closeSettings: () => void;
}

const SettingsModalContext = createContext<SettingsModalContextValue | null>(null);

export function useSettingsModal(): SettingsModalContextValue {
  const ctx = useContext(SettingsModalContext);
  if (!ctx) {
    throw new Error('useSettingsModal must be used within a SettingsModalProvider');
  }
  return ctx;
}

export function SettingsModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<string | undefined>(undefined);

  const openSettings = useCallback((next?: string) => {
    if (!isDesktop()) return false;
    setSection(next);
    setOpen(true);
    return true;
  }, []);

  const closeSettings = useCallback(() => setOpen(false), []);

  // Let the shared research-agent-ui package (e.g. the input box's settings
  // menu item) route through the modal on desktop instead of navigating.
  useEffect(() => {
    configureResearchAgentUI({ onOpenSettings: openSettings });
    return () => configureResearchAgentUI({ onOpenSettings: undefined });
  }, [openSettings]);

  return (
    <SettingsModalContext.Provider value={{ openSettings, closeSettings }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          hideCloseButton
          className="p-0 gap-0 max-w-4xl w-[calc(100%-2rem)] h-[85vh] overflow-hidden"
        >
          <DialogTitle className="sr-only">Settings</DialogTitle>
          {open && (
            <div className="flex h-full w-full flex-col overflow-hidden">
              {/* Re-mount per section so deep links pick the right initial tab */}
              <SettingsContent
                key={section ?? 'default'}
                onClose={closeSettings}
                initialSection={section}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SettingsModalContext.Provider>
  );
}
