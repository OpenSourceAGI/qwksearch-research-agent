/**
 * SVG icon component for the “SizeL” glyph used in the editor's toolbar and menus. Encapsulates the vector markup so the icon scales and inherits the current theme color.
 */

import type { SVGProps } from 'react';

export function SizeL(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' width='1em' height='1em' viewBox='0 0 24 24' {...props}>
      <path fill='currentColor' d='M9 7v10h6v-2h-4V7z'></path>
    </svg>
  );
}
