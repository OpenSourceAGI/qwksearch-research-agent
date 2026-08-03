/**
 * Thin wrapper exposing the text-alignment control as a standalone toolbar piece. Used to place alignment buttons in the example toolbar.
 */

import { RichTextAlign } from '@/extensions/TextAlign/components/RichTextAlign';

export function AlignToolbar() {
  return <RichTextAlign />;
}
