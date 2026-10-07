import { useState, useCallback } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FolderKanban, Layers, Download, History, Star } from "lucide-react"
import AppHeader from "@/components/AppHeader"
import OrganizerFrame from "@/components/OrganizerFrame"
import ExtensionSettings from "@/components/ExtensionSettings"
import TabSearch from "@/components/TabSearch"
import TabList from "@/components/TabList"
import ResearchTab from "@/components/ResearchTab"
import DownloadsList from "@/components/DownloadsList"
import HistoryList from "@/components/HistoryList"
import BookmarksList from "@/components/BookmarksList"
import { cn } from "@/lib/utils"
import { isFullPage, openFullPage } from "@/lib/extension-settings"
import { searchEngines } from "../../content/shortcut-search-web";

/** Views reached from the header buttons rather than the tab row. */
type HeaderView = "ai" | "settings"

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

export default function SidePanel() {
  const [results, setResults] = useState<TabResult[]>([])

  const fetchAllTabs = useCallback(() => {
    chrome.tabs.query({}, (tabs) => {
      const newResults = tabs
        .filter((tab) => !tab.url?.startsWith("chrome://"))
        .map((tab) => ({
          id: tab.id!,
          title: tab.title || "",
          url: tab.url || "",
          active: tab.active || false,
          favIconUrl:
            `chrome-extension://${chrome.runtime.id}` +
            `/_favicon/?pageUrl=${encodeURIComponent(tab.url || "")}&size=16`,
          dispString: undefined as string | undefined,
          muted: tab.mutedInfo?.muted,
          audible: tab.audible
        }))
      setResults(newResults)
    })
  }, [])

  const fullPage = isFullPage()
  const [view, setView] = useState("organize")
  const toggle = (headerView: HeaderView) =>
    setView((current) => (current === headerView ? "organize" : headerView))

  const popOut = async () => {
    const current = await chrome.windows.getCurrent()
    await openFullPage(chrome, current.id)
    window.close()
  }

  return (
    <div
      className={cn(
        "bg-[#f7f7f7] container mx-auto p-2 h-screen flex flex-col",
        fullPage ? "max-w-5xl" : "max-w-sm"
      )}
    >
      <AppHeader
        aiActive={view === "ai"}
        settingsActive={view === "settings"}
        fullPage={fullPage}
        onAskAI={() => toggle("ai")}
        onSettings={() => toggle("settings")}
        onPopOut={popOut}
      />
      <Tabs value={view} onValueChange={setView} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="w-full justify-between">
          <TabsTrigger value="organize" className="flex items-center gap-1 px-2">
            <FolderKanban size={16} />
            <span>Organize</span>
          </TabsTrigger>
          <TabsTrigger value="tabs" className="flex items-center gap-1 px-2" title="Tabs">
            <Layers size={16} />
            <span className={cn(!fullPage && "sr-only")}>Tabs</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1 px-2" title="History">
            <History size={16} />
            <span className={cn(!fullPage && "sr-only")}>History</span>
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex items-center gap-1 px-2" title="Favorites">
            <Star size={16} />
            <span className={cn(!fullPage && "sr-only")}>Favorites</span>
          </TabsTrigger>
          <TabsTrigger value="downloads" className="flex items-center gap-1 px-2" title="Downloads">
            <Download size={16} />
            <span className={cn(!fullPage && "sr-only")}>Downloads</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organize" className="min-h-0 flex-1">
          <OrganizerFrame />
        </TabsContent>

        <TabsContent value="tabs" className="min-h-0 flex-1 overflow-auto">
          <TabSearch
            results={results}
            setResults={setResults}
            fetchAllTabs={fetchAllTabs}
            searchEngines={searchEngines}
          />
          <TabList
            results={results}
            setResults={setResults}
            fetchAllTabs={fetchAllTabs}
          />
        </TabsContent>

        {/* translateZ(0) makes this the containing block for the chat UI's
            position:fixed pieces (its mobile footer menu), so they stay inside
            the chat area instead of covering the header. */}
        <TabsContent value="ai" className="min-h-0 flex-1 [transform:translateZ(0)]">
          <ResearchTab />
        </TabsContent>

        <TabsContent value="settings" className="min-h-0 flex-1 overflow-auto rounded-md bg-white">
          <ExtensionSettings />
        </TabsContent>

        <TabsContent value="downloads" className="min-h-0 flex-1 overflow-auto">
          <DownloadsList />
        </TabsContent>

        <TabsContent value="history" className="min-h-0 flex-1 overflow-auto">
          <HistoryList />
        </TabsContent>

        <TabsContent value="favorites" className="min-h-0 flex-1 overflow-auto">
          <BookmarksList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
