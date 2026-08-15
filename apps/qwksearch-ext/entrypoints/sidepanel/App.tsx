import { useState, useCallback } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Layers, BrainCircuit, Download, History } from "lucide-react"
import TabSearch from "@/components/TabSearch"
import TabList from "@/components/TabList"
import ResearchTab from "@/components/ResearchTab"
import DownloadsList from "@/components/DownloadsList"
import HistoryList from "@/components/HistoryList"
import { searchEngines } from "../../content/shortcut-search-web";

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

  return (
    <div className="bg-[#f7f7f7] container mx-auto p-2 max-w-sm h-screen">
      <Tabs defaultValue="tabs" className="w-full">
        <TabsList>
          <TabsTrigger value="tabs" className="flex items-center gap-2">
            <Layers size={16} />
            <span>Tabs</span>
          </TabsTrigger>
          <TabsTrigger value="research" className="flex items-center gap-2">
            <BrainCircuit size={16} />
            <span>Research</span>
          </TabsTrigger>
          <TabsTrigger value="downloads" className="flex items-center gap-2">
            <Download size={16} />
            <span>Downloads</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History size={16} />
            <span>History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tabs">
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

        <TabsContent value="research">
          <ResearchTab />
        </TabsContent>

        <TabsContent value="downloads">
          <DownloadsList />
        </TabsContent>

        <TabsContent value="history">
          <HistoryList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
