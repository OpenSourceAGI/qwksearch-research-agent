import { useCallback, useEffect, useRef, useState } from "react"
import { Pencil, X } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { isBookmarkNode, sanitizeBookmarkTitle, titleOrHostname } from "@/lib/bookmarks"

interface BookmarkResult {
  id: string
  url: string
  title: string
  rawTitle: string
  favIconUrl: string
}

const MAX_BOOKMARKS = 20

export default function BookmarksList() {
  const [bookmarks, setBookmarks] = useState<BookmarkResult[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const cancellingEditRef = useRef(false)

  const fetchBookmarks = useCallback(() => {
    chrome.bookmarks.getRecent(MAX_BOOKMARKS, (nodes) => {
      setBookmarks(
        nodes
          .filter(isBookmarkNode)
          .map((node) => ({
            id: node.id,
            url: node.url!,
            title: titleOrHostname(node),
            rawTitle: node.title ?? "",
            favIconUrl:
              `chrome-extension://${chrome.runtime.id}` +
              `/_favicon/?pageUrl=${encodeURIComponent(node.url!)}&size=16`
          }))
      )
    })
  }, [])

  useEffect(() => {
    fetchBookmarks()
    chrome.bookmarks.onCreated.addListener(fetchBookmarks)
    chrome.bookmarks.onRemoved.addListener(fetchBookmarks)
    chrome.bookmarks.onChanged.addListener(fetchBookmarks)
    return () => {
      chrome.bookmarks.onCreated.removeListener(fetchBookmarks)
      chrome.bookmarks.onRemoved.removeListener(fetchBookmarks)
      chrome.bookmarks.onChanged.removeListener(fetchBookmarks)
    }
  }, [fetchBookmarks])

  function openBookmark(url: string) {
    chrome.tabs.create({ url })
  }

  function removeBookmark(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    chrome.bookmarks.remove(id, () => fetchBookmarks())
  }

  function startEditing(bookmark: BookmarkResult, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(bookmark.id)
    setEditValue(bookmark.rawTitle)
  }

  function cancelEditing() {
    cancellingEditRef.current = true
    setEditingId(null)
    setEditValue("")
  }

  function saveEdit(id: string) {
    const title = sanitizeBookmarkTitle(editValue)
    chrome.bookmarks.update(id, { title }, () => {
      fetchBookmarks()
      setEditingId(null)
    })
  }

  function handleEditBlur(id: string) {
    if (cancellingEditRef.current) {
      cancellingEditRef.current = false
      return
    }
    saveEdit(id)
  }

  function handleEditKeyDown(id: string, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      saveEdit(id)
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancelEditing()
    }
  }

  return (
    <>
      <div className="list-group col">
        {bookmarks.map((bookmark) => (
          <div
            key={bookmark.id}
            className="list-group-item select-none cursor-pointer"
            onClick={() => openBookmark(bookmark.url)}
          >
            <div className="py-2 px-3 flex items-center space-x-3 transition-colors duration-200 rounded-md border bg-slate-200 border-slate-300 hover:bg-gray-100">
              <img src={bookmark.favIconUrl} alt="" className="w-4 h-4 shrink-0" />

              <div className="grow flex flex-col justify-center overflow-hidden">
                {editingId === bookmark.id ? (
                  <Input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(bookmark.id, e)}
                    onBlur={() => handleEditBlur(bookmark.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-6 px-1 py-0 text-sm"
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-900 truncate" title={bookmark.title}>
                    {bookmark.title}
                  </p>
                )}
                <p className="text-xs text-gray-500 truncate">{bookmark.url}</p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-6 w-6 hover:bg-slate-300"
                onClick={(e) => startEditing(bookmark, e)}
                title="Edit bookmark title"
              >
                <Pencil size={14} className="text-gray-500" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-6 w-6 hover:bg-slate-300"
                onClick={(e) => removeBookmark(bookmark.id, e)}
                title="Remove bookmark"
              >
                <X size={14} className="text-gray-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {bookmarks.length === 0 && (
        <div className="p-2 text-sm italic text-gray-600">No favorites yet</div>
      )}
    </>
  )
}
