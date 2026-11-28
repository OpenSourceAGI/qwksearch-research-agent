export function currentText(el: HTMLElement): string {
  return el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value : el.innerText || el.textContent || '';
}

function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function pasteInto(el: HTMLElement, text: string): void {
  try {
    const data = new DataTransfer();
    data.setData('text/plain', text);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  } catch {
    // Synthetic paste is unavailable; the execCommand path below takes over.
  }
}

function seemsFilled(el: HTMLElement, text: string): boolean {
  const probe = text.trim().slice(0, 40).replace(/\s+/g, ' ');
  return currentText(el).replace(/\s+/g, ' ').includes(probe);
}

/**
 * Puts `text` in the prompt box the way a paste would, so framework-managed
 * editors (React textareas, ProseMirror, Lexical, Quill) notice it. Returns
 * whether the text visibly landed; nothing is submitted.
 */
export function fillInput(el: HTMLElement, text: string): boolean {
  el.focus();
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    setNativeValue(el, text);
    return seemsFilled(el, text);
  }
  pasteInto(el, text);
  if (seemsFilled(el, text)) return true;
  el.focus();
  const doc = el.ownerDocument;
  doc.getSelection()?.selectAllChildren(el);
  try {
    // One paragraph per line: a single insertText of "\n" is turned into doubled breaks by most editors.
    text.split('\n').forEach((line, i) => {
      if (i > 0) doc.execCommand('insertParagraph');
      if (line) doc.execCommand('insertText', false, line);
    });
  } catch {
    // Some editors reject execCommand; the check below reports the failure.
  }
  return seemsFilled(el, text);
}

/** Resolves with the element once `find` returns one, or null after `timeoutMs`. */
export function waitFor<T extends Element>(
  find: () => T | null,
  timeoutMs = 20_000,
  doc: Document = document
): Promise<T | null> {
  return new Promise((resolve) => {
    const first = find();
    if (first) return resolve(first);
    const observer = new MutationObserver(() => {
      const el = find();
      if (el) done(el);
    });
    const timer = setTimeout(() => done(null), timeoutMs);
    function done(el: T | null) {
      observer.disconnect();
      clearTimeout(timer);
      resolve(el);
    }
    observer.observe(doc.documentElement, { childList: true, subtree: true });
  });
}
