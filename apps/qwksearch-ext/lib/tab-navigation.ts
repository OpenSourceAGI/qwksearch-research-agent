function withActiveTabId(callback: (tabId: number) => void): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id
    if (tabId !== undefined) callback(tabId)
  })
}

export function goBackActiveTab(): void {
  withActiveTabId((tabId) => chrome.tabs.goBack(tabId))
}

export function refreshActiveTab(): void {
  withActiveTabId((tabId) => chrome.tabs.reload(tabId))
}
