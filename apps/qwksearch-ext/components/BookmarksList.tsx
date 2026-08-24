import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, Folder, Pencil, X } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import {
  folderDisplayTitle,
  isBookmarkNode,
  isFolderNode,
  sanitizeBookmarkTitle,
  sanitizeBookmarkUrl,
  titleOrHostname
} from "@/lib/bookmarks"

interface BookmarkResult {
  id: string
  url: string
  title: string
  rawTitle: string
  favIconUrl: string
}

interface BookmarkFolder {
  id: string
  title: string
}

const MAX_BOOKMARKS = 20
const ROOT_FOLDER_ID = "0"

function faviconUrl(url: string): string {
  return (
    `chrome-extension://${chrome.runtime.id}` +
    `/_favicon/?pageUrl=${encodeURIComponent(url)}&size=16`
  )
}

export default function BookmarksList() {
  const [viewMode, setViewMode] = useState<"recent" | "folders">("recent")
  const [bookmarks, setBookmarks] = useState<BookmarkResult[]>([])
  const [folderStack, setFolderStack] = useState<BookmarkFolder[]>([])
  const [childFolders, setChildFolders] = useState<BookmarkFolder[]>([])
  const [folderBookmarks, setFolderBookmarks] = useState<BookmarkResult[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editUrlValue, setEditUrlValue] = useState("")
  const cancellingEditRef = useRef(false)

  const currentFolderId = folderStack.length
    ? folderStack[folderStack.length - 1].id
    : ROOT_FOLDER_ID

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
            favIconUrl: faviconUrl(node.url!)
          }))
      )
    })
  }, [])

  const fetchFolderChildren = useCallback(() => {
    chrome.bookmarks.getChildren(currentFolderId, (nodes) => {
      const folders: BookmarkFolder[] = []
      const items: BookmarkResult[] = []
      for (const node of nodes) {
        if (isFolderNode(node)) {
          folders.push({ id: node.id, title: folderDisplayTitle(node) })
        } else if (isBookmarkNode(node)) {
          items.push({
            id: node.id,
            url: node.url!,
            title: titleOrHostname(node),
            rawTitle: node.title ?? "",
            favIconUrl: faviconUrl(node.url!)
          })
        }
      }
      setChildFolders(folders)
      setFolderBookmarks(items)
    })
  }, [currentFolderId])

  useEffect(() => {
    const refresh = () => {
      if (viewMode === "recent") fetchBookmarks()
      else fetchFolderChildren()
    }
    refresh()
    chrome.bookmarks.onCreated.addListener(refresh)
    chrome.bookmarks.onRemoved.addListener(refresh)
    chrome.bookmarks.onChanged.addListener(refresh)
    chrome.bookmarks.onMoved.addListener(refresh)
    return () => {
      chrome.bookmarks.onCreated.removeListener(refresh)
      chrome.bookmarks.onRemoved.removeListener(refresh)
      chrome.bookmarks.onChanged.removeListener(refresh)
      chrome.bookmarks.onMoved.removeListener(refresh)
    }
  }, [viewMode, fetchBookmarks, fetchFolderChildren])

  function openBookmark(url: string) {
    chrome.tabs.create({ url })
  }

  function openFolder(folder: BookmarkFolder, e: React.MouseEvent) {
    e.stopPropagation()
    setFolderStack((stack) => [...stack, folder])
  }

  function goBack() {
    setFolderStack((stack) => stack.slice(0, -1))
  }

  function removeBookmark(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    chrome.bookmarks.remove(id, () => {
      if (viewMode === "recent") fetchBookmarks()
      else fetchFolderChildren()
    })
  }

  function startEditing(bookmark: BookmarkResult, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(bookmark.id)
    setEditValue(bookmark.rawTitle)
    setEditUrlValue(bookmark.url)
  }

  function cancelEditing() {
    cancellingEditRef.current = true
    setEditingId(null)
    setEditValue("")
    setEditUrlValue("")
  }

  function saveEdit(id: string) {
    const title = sanitizeBookmarkTitle(editValue)
    const url = sanitizeBookmarkUrl(editUrlValue)
    if (url === null) {
      // Invalid URL: keep edit mode open so the user can fix it, don't save.
      return
    }
    chrome.bookmarks.update(id, { title, url }, () => {
      if (viewMode === "recent") fetchBookmarks()
      else fetchFolderChildren()
      setEditingId(null)
    })
  }

  function handleEditBlur(id: string, e: React.FocusEvent<HTMLDivElement>) {
    if (cancellingEditRef.current) {
      cancellingEditRef.current = false
      return
    }
    const nextFocused = e.relatedTarget as Node | null
    if (nextFocused && e.currentTarget.contains(nextFocused)) {
      // Focus is moving between the title and URL inputs within the same
      // edit session — don't save/exit yet.
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

  function renderBookmarkRow(bookmark: BookmarkResult) {
    return (
      <div
        key={bookmark.id}
        className="list-group-item select-none cursor-pointer"
        onClick={() => openBookmark(bookmark.url)}
      >
        <div className="py-2 px-3 flex items-center space-x-3 transition-colors duration-200 rounded-md border bg-slate-200 border-slate-300 hover:bg-gray-100">
          <img src={bookmark.favIconUrl} alt="" className="w-4 h-4 shrink-0" />

          <div className="grow flex flex-col justify-center overflow-hidden">
            {editingId === bookmark.id ? (
              <div
                className="flex flex-col gap-0.5"
                onBlur={(e) => handleEditBlur(bookmark.id, e)}
              >
                <Input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => handleEditKeyDown(bookmark.id, e)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-6 px-1 py-0 text-sm"
                />
                <Input
                  value={editUrlValue}
                  onChange={(e) => setEditUrlValue(e.target.value)}
                  onKeyDown={(e) => handleEditKeyDown(bookmark.id, e)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-5 px-1 py-0 text-xs"
                />
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-900 truncate" title={bookmark.title}>
                  {bookmark.title}
                </p>
                <p className="text-xs text-gray-500 truncate">{bookmark.url}</p>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-6 w-6 hover:bg-slate-300"
            onClick={(e) => startEditing(bookmark, e)}
            title="Edit bookmark"
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
    )
  }

  function renderFolderRow(folder: BookmarkFolder) {
    return (
      <div
        key={folder.id}
        className="list-group-item select-none cursor-pointer"
        onClick={(e) => openFolder(folder, e)}
      >
        <div className="py-2 px-3 flex items-center space-x-3 transition-colors duration-200 rounded-md border bg-slate-100 border-slate-300 hover:bg-gray-100">
          <Folder size={16} className="shrink-0 text-gray-500" />
          <p className="grow text-sm font-medium text-gray-900 truncate" title={folder.title}>
            {folder.title}
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2 px-1 pb-2">
        <Button
          variant={viewMode === "recent" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setViewMode("recent")}
        >
          Recent
        </Button>
        <Button
          variant={viewMode === "folders" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setViewMode("folders")}
        >
          Folders
        </Button>
      </div>

      {viewMode === "recent" ? (
        <>
          <div className="list-group col">{bookmarks.map(renderBookmarkRow)}</div>
          {bookmarks.length === 0 && (
            <div className="p-2 text-sm italic text-gray-600">No favorites yet</div>
          )}
        </>
      ) : (
        <>
          {folderStack.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-1 ml-1"
              onClick={goBack}
              title={`Back to ${
                folderStack.length > 1
                  ? folderStack[folderStack.length - 2].title
                  : "top level"
              }`}
            >
              <ChevronLeft size={14} className="mr-1" />
              Back
            </Button>
          )}
          {folderStack.length > 0 && (
            <p className="px-2 pb-1 text-xs font-medium text-gray-500 truncate">
              {folderStack[folderStack.length - 1].title}
            </p>
          )}
          <div className="list-group col">
            {childFolders.map(renderFolderRow)}
            {folderBookmarks.map(renderBookmarkRow)}
          </div>
          {childFolders.length === 0 && folderBookmarks.length === 0 && (
            <div className="p-2 text-sm italic text-gray-600">This folder is empty</div>
          )}
        </>
      )}
    </>
  )
}
