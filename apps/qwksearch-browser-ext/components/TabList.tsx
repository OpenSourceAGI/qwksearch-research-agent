import React, { useCallback, useEffect, useRef, useState } from "react"
import Sortable from "sortablejs"
import { ArrowLeft, ArrowRight, Plus, RotateCw, Undo2, X } from "lucide-react"
import { Button } from "./ui/button"
import findMostRecentClosedTabSessionId from "@/lib/undo-close-tab"
import openNewTab from "@/lib/new-tab"
import { goBackActiveTab, goForwardActiveTab, refreshActiveTab } from "@/lib/tab-navigation"

// Extend Window interface for legacy find() method
declare global {
  interface Window {
    find(
      search: string,
      caseSensitive?: boolean,
      backwards?: boolean,
      wrapAround?: boolean,
      wholeWord?: boolean,
      searchInFrames?: boolean,
      showDialog?: boolean
    ): boolean
  }
}

interface TabResult {
  id: number
  title: string
  url: string
  active: boolean
  favIconUrl: string
  dispString?: string
  lastSearchWord?: string
  muted?: boolean
  audible?: boolean
}

interface TabListProps {
  results: TabResult[]
  setResults: React.Dispatch<React.SetStateAction<TabResult[]>>
  fetchAllTabs: () => void
}

const OPTION_HIGHLIGHT_RESULT = 0

export default function TabList({ results, setResults, fetchAllTabs }: TabListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const sortableRef = useRef<Sortable | null>(null)
  const [closedTabSessionId, setClosedTabSessionId] = useState<string | undefined>(undefined)

  const refreshClosedTabs = useCallback(() => {
    chrome.sessions.getRecentlyClosed((sessions) => {
      setClosedTabSessionId(findMostRecentClosedTabSessionId(sessions))
    })
  }, [])

  useEffect(() => {
    refreshClosedTabs()
    chrome.sessions.onChanged.addListener(refreshClosedTabs)
    return () => chrome.sessions.onChanged.removeListener(refreshClosedTabs)
  }, [refreshClosedTabs])

  function undoCloseTab() {
    if (!closedTabSessionId) return
    chrome.sessions.restore(closedTabSessionId)
  }

  useEffect(() => {
    fetchAllTabs()

    const listener = (message: any) => {
      if (message.type === "updateTabLists") {
        fetchAllTabs()
      } else if (message.type === "tabActivated") {
        setResults((tabs) =>
          tabs.map((tab) => ({ ...tab, active: tab.id === message.tabId }))
        )
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  useEffect(() => {
    if (listRef.current && !sortableRef.current) {
      sortableRef.current = new Sortable(listRef.current, {
        animation: 150,
        ghostClass: "sortable-ghost",
        handle: ".cursor-grab",
        onEnd: () => handleSort()
      })
    }
    return () => {
      sortableRef.current?.destroy()
      sortableRef.current = null
    }
  }, [])

  function handleResultClick(result: TabResult) {
    chrome.tabs.get(result.id, (tab) => {
      chrome.windows.get(tab.windowId, (win) => {
        chrome.windows.update(win.id!, { focused: true })
      })
    })

    chrome.tabs.update(result.id, { active: true })

    chrome.scripting.executeScript({
      target: { tabId: result.id, allFrames: true },
      args: [result?.lastSearchWord || "", OPTION_HIGHLIGHT_RESULT],
      func: (search: string, highlightOpt: number) => {
        window.find(search, false, false, true, false, true, false)
        if (highlightOpt) {
          const newNode = document.createElement("mark")
          newNode.className = "highlight"
          const selection = window.getSelection()
          selection?.getRangeAt(0).surroundContents(newNode)
        }
      }
    })
  }

  function handleSort() {
    chrome.runtime.sendMessage({
      type: "updateTabOrder",
      newOrder: results.map((item) => item.id)
    })
    fetchAllTabs()
  }

  function closeTab(tabId: number, e: React.MouseEvent) {
    e.stopPropagation()
    chrome.tabs.remove(tabId, () => {
      setResults((tabs) => tabs.filter((tab) => tab.id !== tabId))
    })
  }

  function toggleAudio(tabId: number, e: React.MouseEvent) {
    e.stopPropagation()
    chrome.tabs.get(tabId, (tab) => {
      chrome.tabs.update(tabId, { muted: !tab.mutedInfo?.muted }, (updatedTab) => {
        setResults((tabs) =>
          tabs.map((t) =>
            t.id === tabId ? { ...t, muted: updatedTab?.mutedInfo?.muted } : t
          )
        )
      })
    })
  }

  return (
    <>
      <div className="flex justify-end mb-1 space-x-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-slate-200"
          onClick={goBackActiveTab}
          title="Back"
        >
          <ArrowLeft size={14} className="text-gray-600" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-slate-200"
          onClick={goForwardActiveTab}
          title="Forward"
        >
          <ArrowRight size={14} className="text-gray-600" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-slate-200"
          onClick={refreshActiveTab}
          title="Refresh"
        >
          <RotateCw size={14} className="text-gray-600" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-slate-200 disabled:opacity-30"
          disabled={!closedTabSessionId}
          onClick={undoCloseTab}
          title="Restore closed tab"
        >
          <Undo2 size={14} className="text-gray-600" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-slate-200"
          onClick={openNewTab}
          title="New tab"
        >
          <Plus size={14} className="text-gray-600" />
        </Button>
      </div>

      <div ref={listRef} className="list-group col">
        {results.map((result) => (
          <div
            key={result.id}
            className="list-group-item select-none cursor-pointer"
            onClick={() => handleResultClick(result)}
          >
            <div
              className={`cursor-grab py-2 px-3 flex items-center space-x-3 transition-colors duration-200 rounded-md border ${
                result.active
                  ? "bg-slate-300 border-slate-300 hover:bg-slate-300"
                  : "bg-slate-200 border-slate-300 hover:bg-gray-100"
              }`}
            >
              {result.favIconUrl ? (
                <img src={result.favIconUrl} alt="" className="w-4 h-4 shrink-0" />
              ) : (
                <div className="w-4 h-4 shrink-0 bg-gray-200 rounded-full" />
              )}

              {(result.audible || result.muted) && (
                <span
                  className="text-slate-800 cursor-pointer"
                  onClick={(e) => toggleAudio(result.id, e)}
                  title={result.muted ? "Unmute" : "Mute"}
                >
                  {result.muted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 5L6 9H2v6h4l5 4V5z" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </span>
              )}

              <div className="grow flex flex-col justify-center overflow-hidden">
                <p className="text-sm font-medium text-gray-900 truncate" title={result.title}>
                  {result.title}
                </p>
                {result.dispString && (
                  <p
                    className="text-xs text-gray-500 break-words"
                    dangerouslySetInnerHTML={{ __html: result.dispString }}
                  />
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-6 w-6 hover:bg-slate-300"
                onClick={(e) => closeTab(result.id, e)}
              >
                <X size={14} className="text-gray-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && (
        <div className="p-2 text-sm italic text-gray-600">
          Search text of open tabs or web
        </div>
      )}

      <style>{`.sortable-ghost { background-color: #cce5ff; }`}</style>
    </>
  )
}
