/**
 * Converts a stored Reason document (HTML, as the Tiptap editor persists it)
 * into a Plate value.
 *
 * This is a *seed* converter, not a migration: it is only used to populate a
 * brand-new collaboration room. Once a Plate room has content, the Yjs document
 * is the source of truth and this is never consulted again — which is why the
 * Tiptap and Plate rooms stay separate until there is a real conversion/export
 * pipeline.
 */

import { createSlateEditor, type Value } from 'platejs';

import { EMPTY_PLATE_VALUE, platePlugins } from './plate-editor-config';

export function htmlToPlateValue(html: string | undefined | null): Value {
  if (!html?.trim()) return EMPTY_PLATE_VALUE as Value;

  const editor = createSlateEditor({ plugins: platePlugins as any });

  const value = editor.api.html.deserialize({ element: html }) as Value;

  return value?.length ? value : (EMPTY_PLATE_VALUE as Value);
}
