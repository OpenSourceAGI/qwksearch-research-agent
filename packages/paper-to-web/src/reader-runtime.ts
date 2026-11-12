/**
 * @fileoverview The reader controls, as one dependency-free browser script:
 *
 * - **Reader mode** — a narrow serif reading column with the contents hidden.
 * - **Underlining on/off** — shows or hides the `==text==` card underlining
 *   (`<mark class="debate-hl">`), like help-docs' `highlight-toggle.tsx`.
 * - **Voice** — reads the paper aloud top to bottom, one block at a time,
 *   scrolling to and outlining the passage being read. With Underlining on it
 *   reads only the underlined words, the way a debater reads a card; off, it
 *   reads everything. Figures and `Figure N:` captions are skipped, and
 *   collapsed Section Summaries are read too — the same rules as help-docs'
 *   `voice-read-text.ts`. Pressing Voice again or Escape stops it.
 *
 * The script is kept as source text (`READER_RUNTIME_SOURCE`) so the
 * standalone HTML export can inline it verbatim, and `mountPaperReader`
 * evaluates that same text for the React widget — one implementation, no
 * bundler-dependent `Function#toString`.
 *
 * Voice uses the browser's own speech synthesis. A host with a better voice
 * (Kokoro, Cloudflare TTS) passes `speak(text, rate)` returning a promise
 * that settles when the clip ends.
 *
 * @module reader-runtime
 */

/** Options for `mountPaperReader`. */
export interface PaperReaderRuntimeOptions {
  /** Speak one passage; resolve when it finishes. Defaults to `speechSynthesis`. */
  speak?: (text: string, rate: number) => Promise<void>
  /** Stop whatever `speak` is playing. */
  cancelSpeech?: () => void
  /** localStorage key prefix for the toggles (default "paper-to-web"). */
  storageKey?: string
}

/** The script text. Plain ES2017, no imports, no outer references. */
export const READER_RUNTIME_SOURCE = String.raw`function mountPaperReader(root, options) {
  options = options || {};
  var key = options.storageKey || "paper-to-web";
  var doc = root.ownerDocument;
  var win = doc.defaultView;
  var BLOCK = "p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, dt, dd, summary, pre, div";
  var SKIP = 'figure, figcaption, img, picture, svg, video, audio, canvas, script, style, noscript, button, select, [aria-hidden="true"], [data-voice-skip]';
  var CAPTION = /^(figure|fig\.)\s*\d+[a-z]?\s*[:.–—-]/i;
  var cleanups = [];
  function read(name, fallback) {
    try { var v = win.localStorage.getItem(key + "-" + name); return v === null ? fallback : v; } catch (e) { return fallback; }
  }
  function write(name, value) {
    try { win.localStorage.setItem(key + "-" + name, value); } catch (e) {}
  }
  function control(name) { return root.querySelector('[data-ptw="' + name + '"]'); }
  function on(el, type, fn) { if (!el) return; el.addEventListener(type, fn); cleanups.push(function () { el.removeEventListener(type, fn); }); }

  function setToggle(name, attr, value, labelOn, labelOff) {
    root.setAttribute(attr, value ? "on" : "off");
    write(name, value ? "on" : "off");
    var button = control(name);
    if (button) {
      button.setAttribute("aria-pressed", value ? "true" : "false");
      var label = button.querySelector("[data-ptw-label]") || button;
      label.textContent = value ? labelOn : labelOff;
    }
  }
  var underline = read("underline", "on") !== "off";
  var reader = read("reader", "off") === "on";
  setToggle("underline", "data-underline", underline, "Underlining on", "Underlining off");
  setToggle("reader", "data-reader", reader, "Reader mode on", "Reader mode off");
  on(control("underline"), "click", function () { underline = !underline; setToggle("underline", "data-underline", underline, "Underlining on", "Underlining off"); });
  on(control("reader"), "click", function () { reader = !reader; setToggle("reader", "data-reader", reader, "Reader mode on", "Reader mode off"); });

  function collectBlocks(content, highlightedOnly) {
    var walker = doc.createTreeWalker(content, 4);
    var blocks = [];
    var current = null, parts = [], lastMark = null;
    function flush() {
      var text = parts.join("").replace(/\s+/g, " ").trim();
      if (current && text && /[0-9A-Za-zÀ-￿]/.test(text) && !CAPTION.test(text)) blocks.push({ element: current, text: text });
      current = null; parts = [];
    }
    for (var node = walker.nextNode(); node; node = walker.nextNode()) {
      var parent = node.parentElement;
      if (!parent || parent.closest(SKIP)) continue;
      var mark = highlightedOnly ? parent.closest("mark") : null;
      if (highlightedOnly && !mark) continue;
      var block = parent.closest(BLOCK) || content;
      var element = content.contains(block) ? block : content;
      if (current !== element) { flush(); current = element; lastMark = null; }
      if (mark && lastMark && mark !== lastMark) parts.push(" ");
      lastMark = mark;
      parts.push(node.nodeValue || "");
    }
    flush();
    return blocks;
  }

  var synth = win.speechSynthesis;
  var speak = options.speak || function (text, rate) {
    return new Promise(function (resolve) {
      if (!synth || !win.SpeechSynthesisUtterance) { resolve(); return; }
      var utterance = new win.SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.onend = function () { resolve(); };
      utterance.onerror = function () { resolve(); };
      synth.speak(utterance);
    });
  };
  var cancel = options.cancelSpeech || function () { if (synth) synth.cancel(); };
  var run = 0;
  var reading = null;
  function setVoiceState(active) {
    var button = control("voice");
    if (!button) return;
    button.setAttribute("aria-pressed", active ? "true" : "false");
    var label = button.querySelector("[data-ptw-label]") || button;
    label.textContent = active ? "Stop" : "Voice";
  }
  function clearReading() { if (reading) reading.removeAttribute("data-voice-reading"); reading = null; }
  function stop() { run += 1; cancel(); clearReading(); setVoiceState(false); }
  function rate() { var select = control("rate"); var value = Number(select && select.value); return value > 0 ? value : 1.2; }
  function start() {
    var content = root.querySelector(".ptw-content") || root;
    var blocks = collectBlocks(content, underline);
    if (blocks.length === 0) return;
    var mine = ++run;
    setVoiceState(true);
    var i = 0;
    (function next() {
      if (mine !== run) return;
      if (i >= blocks.length) { clearReading(); setVoiceState(false); return; }
      var block = blocks[i++];
      clearReading();
      reading = block.element;
      reading.setAttribute("data-voice-reading", "");
      if (reading.scrollIntoView) reading.scrollIntoView({ block: "center", behavior: "smooth" });
      speak(block.text, rate()).then(next, next);
    })();
  }
  on(control("voice"), "click", function () { var button = control("voice"); if (button && button.getAttribute("aria-pressed") === "true") stop(); else start(); });
  on(doc, "keydown", function (event) { if (event.key === "Escape") stop(); });

  return {
    collectBlocks: function (highlightedOnly) { return collectBlocks(root.querySelector(".ptw-content") || root, highlightedOnly); },
    stop: stop,
    destroy: function () { stop(); cleanups.forEach(function (fn) { fn(); }); cleanups = []; },
  };
}`

/** What `mountPaperReader` returns. */
export interface PaperReaderHandle {
  /** The passages Voice would read, for tests and custom players. */
  collectBlocks(highlightedOnly: boolean): Array<{ element: Element; text: string }>
  stop(): void
  destroy(): void
}

type Mount = (root: Element, options?: PaperReaderRuntimeOptions) => PaperReaderHandle

let compiled: Mount | null = null

/** Wire the reader controls inside `root` (see the module doc). */
export function mountPaperReader(root: Element, options: PaperReaderRuntimeOptions = {}): PaperReaderHandle {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  compiled ??= new Function(`return (${READER_RUNTIME_SOURCE})`)() as Mount
  return compiled(root, options)
}
