import React, { useState, useEffect, useRef } from "react"
import { Search, X, Maximize, ChevronDown } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import findInTabContent from "@/lib/find-in-tab-content"

interface TabResult {
  id: number
  title: string
  url: string
  active: boolean
  favIconUrl: string
  dispString?: string
  muted?: boolean
  audible?: boolean
}

interface TabSearchProps {
  results: TabResult[]
  setResults: React.Dispatch<React.SetStateAction<TabResult[]>>
  fetchAllTabs: () => void
  searchEngines: any[]
}

export default function TabSearch({ results, setResults, fetchAllTabs, searchEngines }: TabSearchProps) {
  const [searchText, setSearchText] = useState("")
  const [selectedSearchEngine, setSelectedSearchEngine] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [autocompleteResults, setAutocompleteResults] = useState<any[]>([])
  const [arrowCounter, setArrowCounter] = useState(-1)
  const searchTextRef = useRef(searchText)

  // Keep ref in sync for use in chrome listener
  useEffect(() => {
    searchTextRef.current = searchText
  }, [searchText])

  useEffect(() => {
    const listener = (request: any) => {
      if (request.type === "tabFound") {
        const resultObj = findInTabContent(request, searchTextRef.current, 100)
        if (!resultObj || resultObj.dispString === undefined) return

        setResults((currentResults) => {
          const existingIndex = currentResults.findIndex((r) => r.id === resultObj.id)
          if (existingIndex !== -1) {
            const updated = [...currentResults]
            updated[existingIndex] = { ...updated[existingIndex], ...resultObj }
            return updated
          }
          return [...currentResults, resultObj as any]
        })
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest(".search-dropdown")) setShowDropdown(false)
      if (!target.closest(".autocomplete")) closeAutocomplete()
    }
    window.addEventListener("click", handleClickOutside)
    return () => window.removeEventListener("click", handleClickOutside)
  }, [])

  function searchSelected() {
    if (!searchEngines?.length) return
    const baseURL = searchEngines[selectedSearchEngine].url
    const url = baseURL + encodeURIComponent(searchText)
    chrome.runtime.sendMessage({ type: "openTab", url, bg: false })
  }

  function handleSelectChange(engineKey: number) {
    setSelectedSearchEngine(engineKey)
    setShowDropdown(false)
    if (searchText) {
      const baseURL = searchEngines[engineKey].url
      const url = baseURL + encodeURIComponent(searchText)
      chrome.runtime.sendMessage({ type: "openTab", url, bg: false })
    }
  }

  async function onSearchType(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setSearchText(value)

    if (value === "") {
      await fetchAllTabs()
      setIsOpen(false)
      return
    }

    setIsOpen(true)
    setResults([])

    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (!tab.url?.startsWith("chrome://")) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id!, allFrames: true },
            func: (tabId: number, favIconUrl: string, title: string, url: string) => {
              const content = document.body.innerText
              chrome.runtime.sendMessage({
                type: "tabFound",
                tabId,
                favIconUrl,
                title,
                url,
                content
              })
            },
            args: [tab.id!, tab.favIconUrl || "", tab.title!, tab.url!]
          })
        }
      }
    })
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" && arrowCounter < autocompleteResults.length - 1) {
      setArrowCounter((c) => c + 1)
    } else if (e.key === "ArrowUp" && arrowCounter > 0) {
      setArrowCounter((c) => c - 1)
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (arrowCounter === -1) {
        searchSelected()
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      closeAutocomplete()
    }
  }

  function closeAutocomplete() {
    setIsOpen(false)
    setArrowCounter(-1)
  }

  function clearSearchText() {
    setSearchText("")
    closeAutocomplete()
    fetchAllTabs()
  }

  function openDebateApp() {
    chrome.runtime.sendMessage({ type: "openDebateApp" })
  }

  return (
    <div className="container mx-auto max-w-sm">
      <div className="mb-2">
        <div className="relative autocomplete">
          <Search
            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
            size={20}
          />
          <Input
            value={searchText}
            onChange={onSearchType}
            onKeyDown={onKeyDown}
            className="pl-10 pr-8"
            placeholder="Search tab text or web"
          />
          {searchText && (
            <button
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              onClick={clearSearchText}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex space-x-1 mb-2">
        <div className="relative inline-block text-left grow search-dropdown">
          <Button
            type="button"
            className="w-full bg-slate-400 hover:bg-slate-500 inline-flex items-center justify-between"
          >
            <div className="flex items-center grow" onClick={searchSelected}>
              <span className="flex items-center">
                {searchEngines?.[selectedSearchEngine] && (
                  <>
                    <img
                      alt={searchEngines[selectedSearchEngine].name}
                      src={`data:image/png;base64,${searchEngines[selectedSearchEngine].icon}`}
                      className="h-4 w-4 mr-2"
                    />
                    {searchEngines[selectedSearchEngine].name}
                  </>
                )}
              </span>
            </div>
            <div
              className="shrink-0 ml-2"
              onClick={(e) => {
                e.stopPropagation()
                setShowDropdown(!showDropdown)
              }}
            >
              <ChevronDown className="h-4 w-4" />
            </div>
          </Button>

          {showDropdown && (
            <div className="absolute left-0 z-10 mt-2 w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-slate-400 ring-opacity-5 focus:outline-none">
              <div className="py-1" role="menu">
                {searchEngines?.map((engine: any, index: number) => (
                  <button
                    key={index}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    role="menuitem"
                    onClick={() => handleSelectChange(index)}
                  >
                    <span className="flex items-center">
                      <img
                        alt={engine.name}
                        src={`data:image/png;base64,${engine.icon}`}
                        className="h-4 w-4 mr-2"
                      />
                      <span className="font-bold">{engine.name}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Button onClick={openDebateApp} className="shrink-0 ml-1">
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
