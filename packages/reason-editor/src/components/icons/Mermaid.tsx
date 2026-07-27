/**
 * SVG icon component for the “Mermaid” glyph used in the editor's toolbar and menus. Encapsulates the vector markup so the icon scales and inherits the current theme color.
 */

export function Mermaid() {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' width='1em' height='1em' viewBox='0 0 48 48'>
      <g fill='none' stroke='currentColor' strokeWidth='4'>
        <circle cx='10' cy='24' r='4'></circle>
        <circle cx='38' cy='10' r='4'></circle>
        <circle cx='38' cy='24' r='4'></circle>
        <circle cx='38' cy='38' r='4'></circle>
        <path strokeLinecap='round' strokeLinejoin='round' d='M34 38H22V10h12M14 24h20'></path>
      </g>
    </svg>
  );
}
