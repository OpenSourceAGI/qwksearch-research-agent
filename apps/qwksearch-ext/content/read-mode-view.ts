declare global {
  interface Window {
    originalHTML?: string;
    readingModeHTML?: string;
    cssToggleState?: {
      stylesheets: (HTMLStyleElement | HTMLLinkElement)[];
      inlineStyles: Map<Element, string>;
      disabled: boolean;
    };
  }
}

import { extractContentAndCite } from "../../../packages/extract-webpage/src/html-to-content/html-to-content";

export function setupReadModeView() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "activateReadingMode") {
      toggleReadingMode();
      sendResponse({ success: true });
    }
  });
}

/**
 * Toggles Reading Mode on the current page
 */
export async function toggleReadingMode() {
  // Toggle from cache first
  if (window.originalHTML) {
    if (document.querySelector("#readability-content")) {
      const readingModeHTML = document.documentElement.innerHTML;
      if (readingModeHTML.includes("readability-content")) {
        window.readingModeHTML = readingModeHTML;
      }
      document.documentElement.innerHTML = window.originalHTML;
    } else {
      const readingModeHTML = window.readingModeHTML;
      if (readingModeHTML) {
        document.documentElement.innerHTML = readingModeHTML;
      }
    }
    return;
  }

  window.originalHTML = document.documentElement.outerHTML;

  const url = document.location.href;
  const article = extractContentAndCite(document, { url });

  if (!article) {
    console.error("Failed to extract content");
    return;
  }

  if ("error" in article) {
    console.error("Failed to extract content:", article.error);
    return;
  }

  const { title, author_short, author_cite, date, source, html } = article;

  const cite = author_cite;

  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const year = formattedDate
    ? new Date(date).getFullYear()?.toString().slice(-2)
    : "";

  toggleAllCSS();

  // Create the overlay
  const overlay = document.createElement("div");
  overlay.id = "custom-reading-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.zIndex = "999999";
  overlay.style.background = "rgba(255,255,255,0.98)";
  overlay.style.overflow = "auto";

  overlay.innerHTML = `
    <div style="display:flex;flex-direction:row;height:100vh;overflow:hidden;background:linear-gradient(120deg,#f8fafc 0%,#e2e8f0 100%)">
      <div id="reading-mode-controls" style="width:110px;min-width:90px;max-width:140px;overflow-y:auto;color:#000;background:linear-gradient(to bottom,#f1f5f9,#e2e8f0);padding:20px;box-shadow:2px 0 8px rgba(0,0,0,0.05);border-right:1px solid #e2e8f0"></div>
      <div id="readability-content" style="flex:1;overflow-y:auto;padding:60px 0;background:transparent">
        <div style="max-width:48rem;margin:40px 15vw;font-family:Georgia,serif;font-size:1.125rem;line-height:1.75;background:rgba(255,255,255,0.9);border-radius:1rem;box-shadow:0 8px 32px rgba(60,72,88,0.1);padding:3rem 2.5rem;border:1px solid #e2e8f0">
          <div contenteditable style="color:#6b7280;margin-bottom:1rem;font-size:0.875rem;letter-spacing:0.05em;font-style:italic">
            ${author_short ? author_short + " " + year : ""}
          </div>
          <div style="border-bottom:1px solid #e5e7eb;font-size:0.875rem;color:#6b7280;padding-bottom:0.5rem;margin-bottom:1rem">
            <p contenteditable style="margin-top:0.5rem">${cite || ""}</p>
          </div>
          <div style="font-size:1.5rem;font-weight:bold;color:#334155;margin-bottom:1.5rem;letter-spacing:-0.025em">
            ${title || ""}
          </div>
          <div id="article-text" style="color:#1e293b">
            ${html || ""}
          </div>
        </div>
      </div>
    </div>
    <button id="close-reading-overlay" style="position:fixed;top:32px;right:40px;z-index:1000000;background:#334155;color:#fff;border:none;border-radius:6px;padding:12px 20px;font-size:22px;cursor:pointer;box-shadow:0 2px 8px rgba(30,41,59,0.1)">✕</button>
  `;

  document.body.appendChild(overlay);

  document.getElementById("close-reading-overlay")!.onclick = () => {
    overlay.remove();
  };

  // Add text selection handler for markup
  document
    .getElementById("readability-content")
    ?.addEventListener("mouseup", handleTextSelection);

  document.body.setAttribute("style", "");
  document.documentElement.setAttribute("style", "");
}

function toggleAllCSS() {
  window.cssToggleState = window.cssToggleState || {
    stylesheets: [],
    inlineStyles: new Map(),
    disabled: false,
  };

  const state = window.cssToggleState;

  if (!state.disabled) {
    state.stylesheets = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]'),
    ) as (HTMLStyleElement | HTMLLinkElement)[];
    state.stylesheets.forEach((el) => {
      (el as any).disabled = true;
    });

    state.inlineStyles.clear();
    document.querySelectorAll("[style]").forEach((el) => {
      state.inlineStyles.set(el, el.getAttribute("style")!);
      el.removeAttribute("style");
    });

    state.disabled = true;
  } else {
    state.stylesheets.forEach((el) => {
      (el as any).disabled = false;
    });

    state.inlineStyles.forEach((style, el) => {
      if (el) el.setAttribute("style", style);
    });

    state.disabled = false;
  }
}

// Markup mode
let currentMode: string | null = null;

export function toggleMarkupMode(mode: string) {
  const content = document.getElementById("readability-content");
  if (!content) return;

  if (currentMode === mode) {
    content.classList.remove(
      "highlight-cursor",
      "underline-cursor",
      "eraser-cursor",
    );
    currentMode = null;
  } else {
    content.classList.remove(
      "highlight-cursor",
      "underline-cursor",
      "eraser-cursor",
    );
    content.classList.add(`${mode}-cursor`);
    currentMode = mode;
  }
}

function handleTextSelection() {
  if (!currentMode) return;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const selectedText = range.toString().trim();
  if (selectedText.length === 0) return;

  if (currentMode === "eraser") {
    eraseMarkup(range);
  } else if (currentMode === "highlight") {
    applyMarkup(range, "highlighted");
  } else if (currentMode === "underline") {
    applyMarkup(range, "underline-only");
  }

  selection.removeAllRanges();
}

function applyMarkup(range: Range, className: string) {
  const iterator = document.createNodeIterator(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    (node) =>
      range.intersectsNode(node)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  );

  const nodesToWrap: Node[] = [];
  let node: Node | null;
  while ((node = iterator.nextNode())) {
    nodesToWrap.push(node);
  }

  nodesToWrap.forEach((node) => {
    const nodeRange = document.createRange();
    nodeRange.selectNodeContents(node);
    const intersectionRange = rangeIntersection(range, nodeRange);
    if (intersectionRange) {
      const span = document.createElement("span");
      span.className = className;
      intersectionRange.surroundContents(span);
    }
  });
}

function rangeIntersection(range1: Range, range2: Range) {
  const start =
    range1.compareBoundaryPoints(Range.START_TO_START, range2) < 0
      ? range2.startContainer
      : range1.startContainer;
  const startOffset =
    range1.compareBoundaryPoints(Range.START_TO_START, range2) < 0
      ? range2.startOffset
      : range1.startOffset;
  const end =
    range1.compareBoundaryPoints(Range.END_TO_END, range2) > 0
      ? range2.endContainer
      : range1.endContainer;
  const endOffset =
    range1.compareBoundaryPoints(Range.END_TO_END, range2) > 0
      ? range2.endOffset
      : range1.endOffset;

  const intersectionRange = document.createRange();
  intersectionRange.setStart(start, startOffset);
  intersectionRange.setEnd(end, endOffset);
  return intersectionRange;
}

function eraseMarkup(range: Range) {
  const iterator = document.createNodeIterator(
    range.commonAncestorContainer,
    NodeFilter.SHOW_ELEMENT,
    (node) => {
      const el = node as HTMLElement;
      return range.intersectsNode(node) &&
        (el.classList?.contains("highlighted") ||
          el.classList?.contains("underline-only") ||
          el.tagName?.toLowerCase() === "i" ||
          el.tagName?.toLowerCase() === "u")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  );

  const nodesToUnwrap: Node[] = [];
  let node: Node | null;
  while ((node = iterator.nextNode())) {
    nodesToUnwrap.push(node);
  }

  nodesToUnwrap.forEach((node) => {
    const parent = node.parentNode!;
    while (node.firstChild) {
      parent.insertBefore(node.firstChild, node);
    }
    parent.removeChild(node);
  });
}
