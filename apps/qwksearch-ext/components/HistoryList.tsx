import { useCallback, useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "./ui/button"
import { formatLastVisit, titleOrHostname } from "@/lib/history"

interface HistoryResult {
  url: string
  title: string
  lastVisit: string
  favIconUrl: string
}

const MAX_HISTORY = 20

export default function HistoryList() {
  const [history, setHistory] = useState<HistoryResult[]>([])

  const fetchHistory = useCallback(() => {
    chrome.history.search({ text: "", maxResults: MAX_HISTORY, startTime: 0 }, (items) => {
      setHistory(
        items
          .filter((item): item is chrome.history.HistoryItem & { url: string } => !!item.url)
          .map((item) => ({
            url: item.url,
            title: titleOrHostname(item),
            lastVisit: formatLastVisit(item.lastVisitTime, Date.now()),
            favIconUrl:
              `chrome-extension://${chrome.runtime.id}` +
              `/_favicon/?pageUrl=${encodeURIComponent(item.url)}&size=16`
          }))
      )
    })
  }, [])

  useEffect(() => {
    fetchHistory()
    chrome.history.onVisited.addListener(fetchHistory)
    chrome.history.onVisitRemoved.addListener(fetchHistory)
    return () => {
      chrome.history.onVisited.removeListener(fetchHistory)
      chrome.history.onVisitRemoved.removeListener(fetchHistory)
    }
  }, [fetchHistory])

  function openHistoryItem(url: string) {
    chrome.tabs.create({ url })
  }

  function removeHistoryItem(url: string, e: React.MouseEvent) {
    e.stopPropagation()
    chrome.history.deleteUrl({ url }, () => fetchHistory())
  }

  return (
    <>
      <div className="list-group col">
        {history.map((item) => (
          <div
            key={item.url}
            className="list-group-item select-none cursor-pointer"
            onClick={() => openHistoryItem(item.url)}
          >
            <div className="py-2 px-3 flex items-center space-x-3 transition-colors duration-200 rounded-md border bg-slate-200 border-slate-300 hover:bg-gray-100">
              <img src={item.favIconUrl} alt="" className="w-4 h-4 shrink-0" />

              <div className="grow flex flex-col justify-center overflow-hidden">
                <p className="text-sm font-medium text-gray-900 truncate" title={item.title}>
                  {item.title}
                </p>
                <p className="text-xs text-gray-500 truncate">{item.lastVisit}</p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-6 w-6 hover:bg-slate-300"
                onClick={(e) => removeHistoryItem(item.url, e)}
                title="Remove from history"
              >
                <X size={14} className="text-gray-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {history.length === 0 && (
        <div className="p-2 text-sm italic text-gray-600">No history yet</div>
      )}
    </>
  )
}
