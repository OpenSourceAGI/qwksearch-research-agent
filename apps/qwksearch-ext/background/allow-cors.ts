const initiatorDomains = ["qwksearch.com", "debate-ai.com"]

export function setupAllowCORS() {
  chrome.runtime.onInstalled.addListener(() => {
    modifyChromeAPIAllowCORS(initiatorDomains)
  })
}

/**
 * Allow CORS - Chrome Extension API.
 * Add (Access-Control-Allow-Origin: *) rule to the response header of all requests
 * to enable cross-domain requests to scrape data from other domains.
 */
function modifyChromeAPIAllowCORS(
  domains: string[],
  receivingDomains = "*"
) {
  return chrome?.declarativeNetRequest?.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          responseHeaders: [
            {
              header: "Access-Control-Allow-Origin",
              operation: chrome.declarativeNetRequest.HeaderOperation.SET,
              value: "*"
            },
            {
              header: "Access-Control-Allow-Methods",
              operation: chrome.declarativeNetRequest.HeaderOperation.SET,
              value: "GET, POST, OPTIONS, PUT, DELETE, PATCH"
            }
          ]
        },
        condition: {
          urlFilter: receivingDomains,
          initiatorDomains: domains,
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
            chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
            chrome.declarativeNetRequest.ResourceType.STYLESHEET,
            chrome.declarativeNetRequest.ResourceType.SCRIPT,
            chrome.declarativeNetRequest.ResourceType.IMAGE,
            chrome.declarativeNetRequest.ResourceType.FONT,
            chrome.declarativeNetRequest.ResourceType.OBJECT,
            chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
            chrome.declarativeNetRequest.ResourceType.PING,
            chrome.declarativeNetRequest.ResourceType.CSP_REPORT,
            chrome.declarativeNetRequest.ResourceType.MEDIA,
            chrome.declarativeNetRequest.ResourceType.WEBSOCKET,
            chrome.declarativeNetRequest.ResourceType.OTHER
          ]
        }
      }
    ]
  })
}
