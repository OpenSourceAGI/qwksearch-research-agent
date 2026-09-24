import { useCallback, useEffect, useState } from "react"
import { FolderOpen, X } from "lucide-react"
import { Button } from "./ui/button"
import { basenameFromPath, formatDownloadStatus } from "@/lib/downloads"

interface DownloadResult {
  id: number
  filename: string
  status: string
  complete: boolean
}

const MAX_DOWNLOADS = 20

export default function DownloadsList() {
  const [downloads, setDownloads] = useState<DownloadResult[]>([])

  const fetchDownloads = useCallback(() => {
    chrome.downloads.search({ orderBy: ["-startTime"], limit: MAX_DOWNLOADS }, (items) => {
      setDownloads(
        items.map((item) => ({
          id: item.id,
          filename: basenameFromPath(item.filename) || item.url,
          status: formatDownloadStatus(item),
          complete: item.state === "complete"
        }))
      )
    })
  }, [])

  useEffect(() => {
    fetchDownloads()
    chrome.downloads.onCreated.addListener(fetchDownloads)
    chrome.downloads.onChanged.addListener(fetchDownloads)
    chrome.downloads.onErased.addListener(fetchDownloads)
    return () => {
      chrome.downloads.onCreated.removeListener(fetchDownloads)
      chrome.downloads.onChanged.removeListener(fetchDownloads)
      chrome.downloads.onErased.removeListener(fetchDownloads)
    }
  }, [fetchDownloads])

  function openDownload(download: DownloadResult) {
    if (!download.complete) return
    chrome.downloads.open(download.id)
  }

  function showDownload(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    chrome.downloads.show(id)
  }

  function removeDownload(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    chrome.downloads.erase({ id }, () => fetchDownloads())
  }

  return (
    <>
      <div className="list-group col">
        {downloads.map((download) => (
          <div
            key={download.id}
            className="list-group-item select-none cursor-pointer"
            onClick={() => openDownload(download)}
          >
            <div className="py-2 px-3 flex items-center space-x-3 transition-colors duration-200 rounded-md border bg-slate-200 border-slate-300 hover:bg-gray-100">
              <div className="grow flex flex-col justify-center overflow-hidden">
                <p
                  className="text-sm font-medium text-gray-900 truncate"
                  title={download.filename}
                >
                  {download.filename}
                </p>
                <p className="text-xs text-gray-500 truncate">{download.status}</p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-6 w-6 hover:bg-slate-300"
                onClick={(e) => showDownload(download.id, e)}
                title="Show in folder"
              >
                <FolderOpen size={14} className="text-gray-500" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-6 w-6 hover:bg-slate-300"
                onClick={(e) => removeDownload(download.id, e)}
                title="Remove from list"
              >
                <X size={14} className="text-gray-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {downloads.length === 0 && (
        <div className="p-2 text-sm italic text-gray-600">No downloads yet</div>
      )}
    </>
  )
}
