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
 * - **Marking menu** — Mark / Unmark the selection, Auto-mark / Clear marks for
 *   the page, and **Undo mark** / **Redo mark**. Every change is recorded in a
 *   capped history (`mark-history.ts`, the last 30 changes) with how it was
 *   made (add or remove, manual selection or automatic page-wide). Cmd+Z /
 *   Ctrl+Z undoes, Cmd+Shift+Z / Ctrl+Shift+Z (and Ctrl+Y off macOS) redoes,
 *   but never while the user is typing in an input, textarea or editor, and
 *   only when the reader is the thing they are working in.
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

import { MARK_HISTORY_SOURCE, type MarkAction, type MarkChange, type MarkHistory, type MarkSource } from "./mark-history"

/** Options for `mountPaperReader`. */
export interface PaperReaderRuntimeOptions {
  /** Speak one passage; resolve when it finishes. Defaults to `speechSynthesis`. */
  speak?: (text: string, rate: number) => Promise<void>
  /** Stop whatever `speak` is playing. */
  cancelSpeech?: () => void
  /** localStorage key prefix for the toggles (default "refdoc"). */
  storageKey?: string
  /**
   * The phrases to underline in one paragraph's text (`autoUnderlinePhrases`).
   * Without it the Auto-mark item is hidden: the standalone HTML export has no
   * phrase picker, its paragraphs are underlined when the paper is converted.
   */
  autoMarkPhrases?: (text: string) => string[]
  /** How many marking changes Undo mark remembers (default 30). */
  markHistoryLimit?: number
  /** Force the macOS (Cmd) or Windows/Linux (Ctrl) shortcut; default: detected. */
  isMac?: boolean
}

/** The script text. Plain ES2017, no imports, no outer references. */
export const READER_RUNTIME_SOURCE = String.raw`function mountPaperReader(root, options) {
  options = options || {};
  var key = options.storageKey || "refdoc";
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

  var createMarkHistory = ${MARK_HISTORY_SOURCE};
  var MARK = "mark.debate-hl";
  var MARK_BLOCK = "p, li, blockquote, td, th, dt, dd, h1, h2, h3, h4, h5, h6, summary";
  var NO_AUTO = "a, code, mark, sup, sub, " + SKIP + ", .ptw-references, .refdoc-references";
  var history = createMarkHistory(options.markHistoryLimit);
  var platform = (win.navigator && (win.navigator.platform || win.navigator.userAgent)) || "";
  var isMac = options.isMac !== undefined ? !!options.isMac : /Mac|iPhone|iPad|iPod/.test(platform);
  var autoPhrases = options.autoMarkPhrases;
  function contentRoot() { return root.querySelector(".ptw-content") || root; }
  function selectionRange() {
    var sel = win.getSelection && win.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    var range = sel.getRangeAt(0);
    return contentRoot().contains(range.commonAncestorContainer) ? range : null;
  }
  function textNodes(container) {
    var walker = doc.createTreeWalker(container, 4);
    var list = [];
    for (var node = walker.nextNode(); node; node = walker.nextNode()) list.push(node);
    return list;
  }
  function wrapText(node, start, end) {
    var target = node;
    if (end < target.length) target.splitText(end);
    if (start > 0) target = target.splitText(start);
    var mark = doc.createElement("mark");
    mark.className = "debate-hl";
    target.parentNode.insertBefore(mark, target);
    mark.appendChild(target);
  }
  function unwrap(mark) {
    var parent = mark.parentNode;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  }
  // Snapshots of every block a command touches; undo and redo swap them back in.
  function recorder() {
    var changes = [];
    return {
      touch: function (block) {
        if (!changes.some(function (change) { return change.block === block; })) changes.push({ block: block, before: block.innerHTML, after: "" });
      },
      finish: function () {
        changes.forEach(function (change) { change.after = change.block.innerHTML; });
        return changes.filter(function (change) { return change.before !== change.after; });
      },
    };
  }
  function commit(changes, action, source, label) {
    if (changes.length === 0) return null;
    var entry = history.record({ action: action, source: source, label: label, changes: changes });
    refreshMarks();
    return entry;
  }
  function showMarks() { if (!underline) { underline = true; setToggle("underline", "data-underline", true, "Underlining on", "Underlining off"); } }

  function markSelection() {
    var range = selectionRange();
    if (!range || range.collapsed) return null;
    var rec = recorder();
    var jobs = [];
    textNodes(contentRoot()).forEach(function (node) {
      var parent = node.parentElement;
      if (!parent || parent.closest(SKIP) || parent.closest("mark") || !range.intersectsNode(node)) return;
      var start = node === range.startContainer ? range.startOffset : 0;
      var end = node === range.endContainer ? range.endOffset : node.length;
      if (end > start && node.nodeValue.slice(start, end).trim()) jobs.push({ node: node, start: start, end: end });
    });
    jobs.forEach(function (job) {
      rec.touch(job.node.parentElement.closest(MARK_BLOCK) || contentRoot());
      wrapText(job.node, job.start, job.end);
    });
    var entry = commit(rec.finish(), "add", "manual", "Mark selection");
    if (entry) { showMarks(); var sel = win.getSelection(); if (sel) sel.removeAllRanges(); }
    return entry;
  }
  function removeMarks(marks, source, label) {
    var rec = recorder();
    marks.forEach(function (mark) {
      rec.touch(mark.closest(MARK_BLOCK) || contentRoot());
      unwrap(mark);
    });
    return commit(rec.finish(), "remove", source, label);
  }
  function unmarkSelection() {
    var range = selectionRange();
    if (!range) return null;
    var marks = Array.prototype.slice.call(contentRoot().querySelectorAll(MARK)).filter(function (mark) { return range.intersectsNode(mark); });
    return removeMarks(marks, "manual", "Unmark selection");
  }
  function clearMarks() {
    return removeMarks(Array.prototype.slice.call(contentRoot().querySelectorAll(MARK)), "auto", "Clear marks");
  }
  function autoMarkParagraph(block, rec) {
    var text = block.textContent || "";
    var taken = [];
    (autoPhrases(text) || []).forEach(function (phrase) {
      var start = phrase ? text.indexOf(phrase) : -1;
      var end = start + phrase.length;
      if (start < 0 || taken.some(function (range) { return start < range[1] && end > range[0]; })) return;
      var jobs = [], offset = 0, blocked = false;
      textNodes(block).forEach(function (node) {
        var from = offset, to = offset + node.length;
        offset = to;
        if (to <= start || from >= end) return;
        if (node.parentElement.closest(NO_AUTO)) blocked = true;
        jobs.push({ node: node, start: Math.max(start, from) - from, end: Math.min(end, to) - from });
      });
      if (blocked || jobs.length === 0) return;
      rec.touch(block);
      jobs.forEach(function (job) { wrapText(job.node, job.start, job.end); });
      taken.push([start, end]);
    });
  }
  function autoMark() {
    if (!autoPhrases) return null;
    var rec = recorder();
    Array.prototype.slice.call(contentRoot().querySelectorAll("p")).forEach(function (block) {
      if (block.closest(NO_AUTO) || block.querySelector("mark, p")) return;
      autoMarkParagraph(block, rec);
    });
    var entry = commit(rec.finish(), "add", "auto", "Auto-mark");
    if (entry) showMarks();
    return entry;
  }
  function applyChanges(entry, undoing) {
    entry.changes.forEach(function (change) {
      if (change.block.isConnected) change.block.innerHTML = undoing ? change.before : change.after;
    });
  }
  function stepMark(undoing) {
    var entry = undoing ? history.undo() : history.redo();
    if (!entry) return null;
    applyChanges(entry, undoing);
    if (!undoing) showMarks();
    refreshMarks();
    return entry;
  }
  function describe(entry) { return entry ? entry.label + " (" + entry.source + " " + entry.action + ")" : ""; }
  function refreshMarks() {
    var undoable = history.entries(), redoable = history.redoEntries();
    var undoButton = control("undo-mark"), redoButton = control("redo-mark");
    var keys = isMac ? ["⌘Z", "⌘⇧Z"] : ["Ctrl+Z", "Ctrl+Shift+Z / Ctrl+Y"];
    [[undoButton, undoable, "Undo mark", keys[0]], [redoButton, redoable, "Redo mark", keys[1]]].forEach(function (item) {
      var button = item[0], list = item[1];
      if (!button) return;
      var next = list[list.length - 1];
      button.disabled = list.length === 0;
      button.setAttribute("aria-disabled", list.length === 0 ? "true" : "false");
      button.title = item[2] + " (" + item[3] + ")" + (next ? ": " + describe(next) : ": nothing to " + (item[2] === "Undo mark" ? "undo" : "redo"));
    });
    if (contentRoot().querySelector(MARK)) root.setAttribute("data-has-underlining", ""); else root.removeAttribute("data-has-underlining");
  }
  var autoButton = control("auto-mark");
  if (autoButton && !autoPhrases) autoButton.hidden = true;
  ["mark", "unmark", "auto-mark", "clear-marks", "undo-mark", "redo-mark"].forEach(function (name) {
    // Keep the text selection alive while a menu item is pressed.
    on(control(name), "mousedown", function (event) { event.preventDefault(); });
  });
  on(control("mark"), "click", markSelection);
  on(control("unmark"), "click", unmarkSelection);
  on(control("auto-mark"), "click", autoMark);
  on(control("clear-marks"), "click", clearMarks);
  on(control("undo-mark"), "click", function () { stepMark(true); });
  on(control("redo-mark"), "click", function () { stepMark(false); });
  refreshMarks();

  function isEditable(el) {
    if (!el || el.nodeType !== 1) return false;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable) return true;
    return !!el.closest('[contenteditable]:not([contenteditable="false"])');
  }
  // Pointer or focus last went into the reader, so a bare page (focus on body) still counts as its context.
  var inside = false;
  function track(event) { inside = root.contains(event.target); }
  on(doc, "pointerdown", track);
  on(doc, "focusin", track);
  function inContext(target) {
    if (target && root.contains(target)) return true;
    if (target !== doc.body && target !== doc.documentElement) return false;
    var sel = win.getSelection && win.getSelection();
    return inside || !!(sel && sel.anchorNode && root.contains(sel.anchorNode));
  }
  function shortcut(event) {
    if (event.altKey) return null;
    var mod = isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
    if (!mod) return null;
    var key = String(event.key || "").toLowerCase();
    if (key === "z") return event.shiftKey ? "redo" : "undo";
    if (key === "y" && !isMac && !event.shiftKey) return "redo";
    return null;
  }
  on(doc, "keydown", function (event) {
    if (event.key === "Escape") { stop(); return; }
    var kind = shortcut(event);
    if (!kind || event.defaultPrevented || event.isComposing) return;
    if (isEditable(event.target) || !inContext(event.target)) return;
    if (kind === "undo" ? !history.canUndo() : !history.canRedo()) return;
    event.preventDefault();
    stepMark(kind === "undo");
  });

  return {
    collectBlocks: function (highlightedOnly) { return collectBlocks(root.querySelector(".ptw-content") || root, highlightedOnly); },
    stop: stop,
    markSelection: markSelection,
    unmarkSelection: unmarkSelection,
    autoMark: autoMark,
    clearMarks: clearMarks,
    undoMark: function () { return stepMark(true); },
    redoMark: function () { return stepMark(false); },
    markHistory: history,
    destroy: function () { stop(); cleanups.forEach(function (fn) { fn(); }); cleanups = []; },
  };
}`

/** One marking change in the history: how it was made, plus the page edits it can swap back and forth. */
export interface MarkEntry extends MarkChange {
  action: MarkAction
  source: MarkSource
  changes: Array<{ block: Element; before: string; after: string }>
}

/** What `mountPaperReader` returns. */
export interface PaperReaderHandle {
  /** The passages Voice would read, for tests and custom players. */
  collectBlocks(highlightedOnly: boolean): Array<{ element: Element; text: string }>
  stop(): void
  /** Underline the selected text. Returns the history entry, or null when nothing was selected. */
  markSelection(): MarkEntry | null
  /** Remove the marks the selection touches. */
  unmarkSelection(): MarkEntry | null
  /** Underline the core claims of every unmarked paragraph (needs `autoMarkPhrases`). */
  autoMark(): MarkEntry | null
  /** Remove every mark on the page. */
  clearMarks(): MarkEntry | null
  /** Undo the most recent marking change (what Cmd/Ctrl+Z does). */
  undoMark(): MarkEntry | null
  /** Redo the most recently undone marking change. */
  redoMark(): MarkEntry | null
  /** The capped history behind Undo mark / Redo mark. */
  markHistory: MarkHistory<MarkEntry>
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
