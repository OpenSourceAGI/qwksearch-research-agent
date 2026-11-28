import { ADAPTERS } from './adapters';
import { currentText, fillInput, waitFor } from './fill';
import type { ClaimResponse } from './handoff';
import { providerForHost } from './providers';
import type { ChatProvider } from './types';
import { Toast } from './ui';
import { isDarkPage } from './theme';

const PASTE_HINT = 'Click the message box, press Ctrl+V (Cmd+V on Mac) to paste it, then press Enter.';

/**
 * Runs on every supported chat site. If the tab was just opened by the
 * "Ask AI" menu on another chat, completes the handoff: pastes the
 * transcript into the prompt box (or confirms it was pre-filled) and tells
 * the user what is left to do. Never presses Enter.
 */
export async function completePendingHandoff(
  doc: Document,
  toast: Toast,
  provider: ChatProvider | undefined = providerForHost(doc.location.hostname)
): Promise<void> {
  if (!provider) return;
  const response: ClaimResponse | undefined = await chrome.runtime
    .sendMessage({ type: 'chatHandoff:claim' })
    .catch(() => undefined);
  const pending = response?.pending;
  if (!pending || pending.providerId !== provider.id) return;
  const adapter = ADAPTERS[provider.id];
  const dark = isDarkPage(doc);

  if (pending.mode === 'clipboard') {
    toast.show(`This chat is too long to fill in automatically. It is on your clipboard. ${PASTE_HINT}`, { dark, ms: 15000 });
    return;
  }

  const input = await waitFor(() => adapter.findInput(doc), 20_000, doc);
  if (!input) {
    toast.show(`Could not find the message box. The chat is on your clipboard. ${PASTE_HINT}`, { dark, ms: 15000 });
    return;
  }

  if (pending.mode === 'url') {
    await new Promise((r) => setTimeout(r, 3000));
    const landed = currentText(input).trim() !== '' || adapter.extractMessages(doc).length > 0;
    if (landed) {
      toast.show('Your previous chat was pre-filled. Press Enter to send it if it did not send itself.', { dark });
      return;
    }
  }

  const text = pending.text;
  if (text && fillInput(input, text)) {
    toast.show('Your previous chat was pasted into the message box. Review it and press Enter to send.', { dark });
  } else {
    toast.show(`Could not fill the message box automatically. The chat is on your clipboard. ${PASTE_HINT}`, { dark, ms: 15000 });
  }
}
