import { useState, useCallback } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Layers, AppWindow, Settings, BrainCircuit } from "lucide-react"
import TabSearch from "@/components/TabSearch"
import TabList from "@/components/TabList"
import ResearchTab from "@/components/ResearchTab"
import SearchSettings from "@/components/SearchSettings"
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
          <TabsTrigger value="apps" className="flex items-center gap-2">
            <AppWindow size={16} />
            <span>Search</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings size={16} />
            <span>AI</span>
          </TabsTrigger>
          <TabsTrigger value="research" className="flex items-center gap-2">
            <BrainCircuit size={16} />
            <span>Research</span>
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

        <TabsContent value="apps">
          <SearchSettings />
        </TabsContent>

        <TabsContent value="settings">
          <div className="p-4 text-sm text-gray-600">
            {/* AI settings - to be implemented */}
            AI settings coming soon...
          </div>
        </TabsContent>

        <TabsContent value="research">
          <ResearchTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
