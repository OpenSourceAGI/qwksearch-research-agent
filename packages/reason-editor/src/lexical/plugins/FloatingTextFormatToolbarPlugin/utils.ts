/**
 * Utility functions for the floating text format toolbar
 */

/**
 * Determines if a color is light or dark based on its brightness
 * @param color - Hex color string (e.g., "#FFFF00")
 * @returns true if the color is light, false if dark
 */
export function isLightColor(color: string): boolean {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
}

/**
 * Updates the selection color dynamically based on highlight background color
 * @param bgColor - Background color to create contrast with, or null to reset
 * @param styleElementRef - Reference to the style element
 */
export function updateSelectionColor(
  bgColor: string | null,
  styleElementRef: React.MutableRefObject<HTMLStyleElement | null>
): void {
  if (!styleElementRef.current) {
    styleElementRef.current = document.createElement('style');
    styleElementRef.current.id = 'dynamic-selection-style';
    document.head.appendChild(styleElementRef.current);
  }

  if (bgColor) {
    // When text has background, make selection color contrast with it
    const textColor = isLightColor(bgColor) ? '#000' : '#fff';
    const selectionBg = isLightColor(bgColor)
      ? 'rgba(0, 0, 0, 0.15)'
      : 'rgba(255, 255, 255, 0.25)';

    styleElementRef.current.textContent = `
      .editor-scroller span[style*="background-color"]::selection {
        background: ${selectionBg} !important;
        color: ${textColor} !important;
      }
      .editor-scroller span[style*="background-color"]::-moz-selection {
        background: ${selectionBg} !important;
        color: ${textColor} !important;
      }
    `;
  } else {
    // Reset to default
    styleElementRef.current.textContent = '';
  }
}
