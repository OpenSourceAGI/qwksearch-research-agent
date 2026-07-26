/**
 * Shared logic for chat message composers.
 */

/**
 * Whether a composer has enough to submit. A request is valid when the user
 * typed some text **or** attached at least one file (uploaded image, PDF, or
 * document). A file-only send is treated by the server as "analyse the
 * uploaded file(s)", so the submit control must become enabled once a file is
 * attached even with no text.
 *
 * @param message - Raw textarea value (may be empty/whitespace).
 * @param fileIds - Ids of files attached to the current chat.
 * @returns `true` when the message can be sent.
 */
export function canSubmitMessage(
  message: string,
  fileIds: readonly string[] | undefined,
): boolean {
  const hasText = (message ?? "").trim().length > 0;
  const hasFiles = Array.isArray(fileIds) && fileIds.length > 0;
  return hasText || hasFiles;
}
