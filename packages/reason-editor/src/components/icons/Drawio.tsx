/**
 * SVG icon component for the “Drawio” glyph used in the editor's toolbar and menus. Encapsulates the vector markup so the icon scales and inherits the current theme color.
 */

export const Drawio = () => (
  <svg
    fill='currentColor'
    viewBox='0 0 24 24'
    xmlns='http://www.w3.org/2000/svg'
  >
    <path d='M3 3v18h18V3H3zm2 2h14v14H5V5z' />
    <path d='M7 7h4v4H7zm6 0h4v4h-4zm-6 6h4v4H7zm6 0h4v4h-4z' fill='currentColor' />
  </svg>
);
