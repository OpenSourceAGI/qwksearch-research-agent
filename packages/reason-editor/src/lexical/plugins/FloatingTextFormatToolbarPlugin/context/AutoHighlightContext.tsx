/**
 * @fileoverview Context for managing auto-highlight state.
 * When enabled, automatically highlights text when selected.
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface AutoHighlightContextType {
  isAutoHighlightEnabled: boolean;
  highlightColor: string;
  toggleAutoHighlight: () => void;
  setHighlightColor: (color: string) => void;
}

const AutoHighlightContext = createContext<AutoHighlightContextType | undefined>(undefined);

export function AutoHighlightProvider({ children }: { children: ReactNode }) {
  console.log('[AutoHighlightProvider] Mounted');
  const [isAutoHighlightEnabled, setIsAutoHighlightEnabled] = useState(false);
  const [highlightColor, setHighlightColorState] = useState('#FFFF00');

  const toggleAutoHighlight = useCallback(() => {
    setIsAutoHighlightEnabled(prev => !prev);
  }, []);

  const setHighlightColor = useCallback((color: string) => {
    setHighlightColorState(color);
  }, []);

  useEffect(() => {
    if (isAutoHighlightEnabled) {
      // Inline SVG data URI for highlighter cursor
      // The highlighter icon is positioned at hotspot (0, 24) - the tip of the highlighter
      const highlighterCursor = `url("data:image/svg+xml,%3Csvg version='1.1' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512.001 512.001' width='32' height='32'%3E%3Cpolygon fill='%23EEBA7D' points='46.578,507.251 0,479.67 43.075,436.595 80.154,473.675'/%3E%3Cpolygon fill='%23E68D2C' points='46.578,507.251 23.288,493.461 61.615,455.135 80.154,473.675'/%3E%3Cpath fill='%23E68D2C' d='M54.542,462.208l31.732,31.732l24.002-24.002l93.176-22.663L499.587,151.14c16.552-16.552,16.552-43.386,0-59.938l-37.019-37.019L425.55,17.164c-16.552-16.552-43.386-16.552-59.939,0L69.474,313.298l-22.663,93.176L22.81,430.476L54.542,462.208z'/%3E%3Cpath fill='%23E06B34' d='M54.542,462.208l31.732,31.732l24.002-24.002l93.176-22.663L499.587,151.14c16.552-16.552,16.552-43.386,0-59.938l-37.019-37.019L54.542,462.208z'/%3E%3Crect x='273.637' y='129.753' transform='matrix(-0.7071 -0.7071 0.7071 -0.7071 358.521 582.2773)' fill='%23A8EAEF' width='52.435' height='174.268'/%3E%3Crect x='296.019' y='139.027' transform='matrix(-0.7071 -0.7071 0.7071 -0.7071 367.7948 604.6673)' fill='%2380CDD8' width='26.219' height='174.268'/%3E%3Cpolygon fill='%23E06B34' points='69.474,313.298 46.812,406.474 22.811,430.476 54.542,462.208 86.273,493.939 110.275,469.938 203.451,447.275 69.475,313.298'/%3E%3Cpolygon fill='%23D1393C' points='136.462,380.287 54.542,462.208 86.273,493.939 110.275,469.938 203.451,447.275 69.475,313.298'/%3E%3C/svg%3E") 0 32, pointer`;

      document.body.style.cursor = highlighterCursor;

      // Apply to all text content areas
      const style = document.createElement('style');
      style.id = 'auto-highlight-cursor';
      style.textContent = `
        .ContentEditable__root,
        .ContentEditable__root * {
          cursor: ${highlighterCursor} !important;
        }
      `;
      document.head.appendChild(style);

      // Add ESC key handler to exit auto-highlight mode
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          console.log('[AutoHighlight] ESC pressed, disabling auto-highlight');
          toggleAutoHighlight();
          event.preventDefault();
          event.stopPropagation();
        }
      };

      document.addEventListener('keydown', handleEscape, true);

      return () => {
        document.body.style.cursor = '';
        const styleElement = document.getElementById('auto-highlight-cursor');
        if (styleElement) {
          styleElement.remove();
        }
        document.removeEventListener('keydown', handleEscape, true);
      };
    } else {
      document.body.style.cursor = '';
      const styleElement = document.getElementById('auto-highlight-cursor');
      if (styleElement) {
        styleElement.remove();
      }
    }
  }, [isAutoHighlightEnabled, toggleAutoHighlight]);

  return (
    <AutoHighlightContext.Provider
      value={{
        isAutoHighlightEnabled,
        highlightColor,
        toggleAutoHighlight,
        setHighlightColor,
      }}>
      {children}
    </AutoHighlightContext.Provider>
  );
}

export function useAutoHighlight() {
  const context = useContext(AutoHighlightContext);
  console.log('[useAutoHighlight] Called, context exists:', !!context);
  if (!context) {
    console.error('[useAutoHighlight] ❌ No context found! Provider not wrapping this component.');
    throw new Error('useAutoHighlight must be used within AutoHighlightProvider');
  }
  return context;
}
