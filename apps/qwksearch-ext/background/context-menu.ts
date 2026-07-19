import { searchEngines } from "../content/shortcut-search-web";

export function setupContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      title: "Search With...",
      id: "searchWithParent",
      contexts: ["selection"]
    })

    for (let i = 0; i < searchEngines.length; i++) {
      chrome.contextMenus.create({
        title: ` ${searchEngines[i].name}`,
        parentId: "searchWithParent",
        id: "searchWith" + i,
        contexts: ["selection"]
      })
    }

    chrome.contextMenus.create({
      title: "Reading Mode",
      id: "readingMode",
      contexts: ["page", "frame", "image", "link", "video", "audio"]
    })
  })

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    const { menuItemId, selectionText } = info

    if (typeof menuItemId === "string" && menuItemId.startsWith("searchWith")) {
      const engineIndex = parseInt(menuItemId.replace("searchWith", ""))
      const url = searchEngines[engineIndex].url + encodeURIComponent(selectionText || "")

      chrome.tabs.create({ url, active: false }, (newTab) => {
        setTimeout(() => {
          chrome.tabs.update(newTab.id!, { active: true })
        }, 1500)
      })
    } else if (menuItemId === "readingMode") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0]
        if (currentTab) {
          chrome.tabs.sendMessage(currentTab.id!, { action: "activateReadingMode" })
        }
      })
    }
  })
}
