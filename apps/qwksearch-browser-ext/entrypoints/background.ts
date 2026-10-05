// The LeoTabs tab organizer's service worker. It registers its own listeners
// when evaluated (collections, sessions, switcher, omnibox, commands); see
// leotabs/extension/lib/host.js for what it leaves to this extension.
import "@/leotabs/extension/background.js"
import { setupContextMenu } from "@/background/context-menu"
import { setupAllowCORS } from "@/background/allow-cors"
import { scrapeURLViaOffscreen } from "@/background/offscreen-scraper"
import { handleInstalled } from "@/lib/welcome"
import { getOpenInTab, openFullPage, OPEN_IN_TAB_KEY } from "@/lib/extension-settings"

export default defineBackground(() => {
  setupContextMenu()
  setupAllowCORS()

  /** FIRST INSTALL: the welcome page with every feature and how to reach it */
  chrome.runtime.onInstalled.addListener((details) => {
    handleInstalled(chrome, details).catch((error) => console.error(error))
  })

  // Listen for messages from sidepanel and content scripts
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    const { type, url } = request
    // LeoTabs messages carry `action` instead and are answered by its own listener.
    if (!type) return

    // Extract HTML invisibly via the offscreen document, no visible tab
    if (type === "extractURL") {
      scrapeURLViaOffscreen(url)
        .then((result) => sendResponse(result))
        .catch((error) =>
          sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) })
        )
    }

    // Open tab in foreground or background
    if (type === "openTab") {
      chrome.tabs.create({
        url,
        active: !request.bg,
        selected: !request.bg
      })
    }

    if (type === "updateTabOrder") {
      updateTabOrder(request.newOrder)
    }

    if (type === "openDebateApp") {
      chrome.runtime.openOptionsPage()
    }

    if (type === "requestFullScreen") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0]
        if (currentTab) {
          chrome.scripting.executeScript(
            {
              target: { tabId: currentTab.id! },
              func: toggleFullScreen
            },
            () => {
              chrome.sidePanel
                .open({ windowId: currentTab.windowId! })
                .then(() => {
                  chrome.sidePanel.setOptions({
                    enabled: true,
                    path: "sidepanel.html"
                  })
                })
            }
          )
        }
      })
    }

    return true
  })

  function toggleFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => {
          chrome.runtime.sendMessage({ type: "fullScreenActivated" })
        })
        .catch((err) => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`)
        })
    } else {
      document.exitFullscreen().then(() => {
        chrome.runtime.sendMessage({ type: "fullScreenDeactivated" })
      })
    }
  }

  /** SIDEPANEL BEHAVIOR */
  // The toolbar icon (and Ctrl+Q) opens the side panel, unless "Open in a full
  // tab" is on in Settings; then the panel is off and onClicked opens a tab.
  async function applyActionBehavior() {
    const openInTab = await getOpenInTab()
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: !openInTab })
  }
  applyActionBehavior().catch((error: Error) => console.error(error))
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && OPEN_IN_TAB_KEY in changes)
      applyActionBehavior().catch((error: Error) => console.error(error))
  })
  chrome.action.onClicked.addListener((tab) => {
    openFullPage(chrome, tab?.windowId).catch((error: Error) => console.error(error))
  })

  /** TAB LISTENERS */
  function notifyTabUpdate(updateType: string, tabId: number, changeInfo: any) {
    chrome.runtime.sendMessage({
      type: "updateTabLists",
      updateType,
      tabId,
      changeInfo
    })
  }

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" || changeInfo.title) {
      notifyTabUpdate("updated", tabId, { url: tab.url, title: tab.title })
    }
  })

  chrome.tabs.onCreated.addListener((tab) => {
    notifyTabUpdate("created", tab.id!, { url: tab.url, title: tab.title })
  })

  chrome.tabs.onRemoved.addListener((tabId) => {
    notifyTabUpdate("removed", tabId, {})
  })

  chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      notifyTabUpdate("activated", tab.id!, { url: tab.url, title: tab.title })
    })
  })

  // Set side panel options when a tab is updated
  chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
    await chrome.sidePanel.setOptions({
      tabId,
      path: "sidepanel.html",
      enabled: true
    })
    notifyTabUpdate("updated", tabId, { url: tab.url, title: tab.title })
  })

  /** TAB REORDERING */
  function updateTabOrder(newOrder: number[]) {
    chrome.windows.getCurrent({ populate: true }, (window) => {
      const currentTabs = window.tabs || []
      const tabIndexMap = new Map(currentTabs.map((tab, index) => [tab.id, index]))

      newOrder.forEach((tabId, newIndex) => {
        const currentIndex = tabIndexMap.get(tabId)
        if (currentIndex !== undefined && currentIndex !== newIndex) {
          chrome.tabs.move(tabId, { index: newIndex })
        }
      })

      setTimeout(() => {
        chrome.runtime.sendMessage({ type: "tabReorderComplete" })
      }, 500)
    })
  }
})
