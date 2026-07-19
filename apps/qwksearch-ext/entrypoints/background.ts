import { setupContextMenu } from "@/background/context-menu"
import { setupAllowCORS } from "@/background/allow-cors"

export default defineBackground(() => {
  setupContextMenu()
  setupAllowCORS()

  // Listen for messages from sidepanel and content scripts
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    const { type, url } = request

    // Open tab to extract HTML, then close
    if (type === "extractURL") {
      chrome.tabs.create(
        { url, selected: false, active: false },
        (tab) => {
          const tabId = tab.id!
          const onTabUpdated = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === "complete") {
              chrome.tabs.onUpdated.removeListener(onTabUpdated)
              chrome.scripting
                .executeScript({
                  target: { tabId },
                  func: () => document.documentElement.outerHTML
                })
                .then((htmlContent) => {
                  sendResponse({ success: true, html: htmlContent?.[0]?.result })
                  chrome.tabs.remove(tabId)
                })
                .catch((error) => {
                  sendResponse({ success: false, error: error.message })
                  chrome.tabs.remove(tabId)
                })
            }
          }
          chrome.tabs.onUpdated.addListener(onTabUpdated)
        }
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
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: Error) => console.error(error))

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
