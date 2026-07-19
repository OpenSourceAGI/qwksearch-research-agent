// Content script listener: forwards page events to background, returns response to page
export function setupMessageApi() {
  document.addEventListener("onInvokeChromeAPI", ((event: CustomEvent) => {
    chrome.runtime
      .sendMessage(event.detail)
      .then((detail) => {
        document.dispatchEvent(new CustomEvent("onExtractionResult", { detail }))
      })
  }) as EventListener)
}
