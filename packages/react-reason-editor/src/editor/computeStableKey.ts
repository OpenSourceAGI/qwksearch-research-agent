/**
 * Combines `contentKey` (falling back to a content prefix) with `reloadToken`
 * into the key {@link TiptapEditorWrapper}'s reload effect watches, so
 * bumping `reloadToken` forces a reload independent of whether the document
 * id itself changed.
 */
export function computeStableKey(
  contentKey: string | undefined,
  content: string,
  reloadToken?: string | number
): string {
  const base = contentKey ?? content.slice(0, 40);
  return reloadToken === undefined ? base : `${base}:${reloadToken}`;
}
