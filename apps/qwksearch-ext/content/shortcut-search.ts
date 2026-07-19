import { openTabSearchWeb, extractGoogleResultsPage } from "./shortcut-search-web"
import { toggleReadingMode } from "./read-mode-view"

/**
 * Select Text, Press Backtick To Search Google,
 * Backtick again for First Result
 */
function onKeyDown(e: KeyboardEvent) {
  if (e.keyCode === 192 && !e.altKey && !e.ctrlKey) {
    if (isInsideTextInput(e.target as HTMLElement)) return

    e.preventDefault()
    e.stopPropagation()
    const textSelected = window?.getSelection()?.toString()

    // If on Google results page, load first result
    if (
      document.location.host.match(/google/gi) &&
      document.location.href.match(/search/gi) &&
      document.querySelectorAll("a[href]:has(h3)")?.length > 0
    ) {
      const results = extractGoogleResultsPage(document)
      if (results.length > 0) document.location.href = results[0].url
    } else if (textSelected?.length) {
      // If text selected, search it
      const shouldOpenInBackground = e.shiftKey
      openTabSearchWeb(textSelected, shouldOpenInBackground)
    } else {
      // Else toggle Reading Mode
      toggleReadingMode()
    }

    const readingModeHTML = document.documentElement.outerHTML
    localStorage.setItem("readingModeHTML", readingModeHTML)
  }
}

function isInsideTextInput(i: HTMLElement) {
  return (
    i instanceof HTMLImageElement ||
    i instanceof HTMLInputElement ||
    i instanceof HTMLTextAreaElement ||
    (i as any).textbox ||
    (i.textContent && i.textContent === "") ||
    (i.ownerDocument?.designMode?.match(/on/i))
  )
}

export function setupShortcutSearch() {
  window.addEventListener("keydown", onKeyDown, false)
}
