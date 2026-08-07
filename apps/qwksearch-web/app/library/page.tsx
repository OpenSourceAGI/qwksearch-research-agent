'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import grab from 'grab-url';
import { toast } from 'sonner';
import {
  Sun, Clock, CalendarDays, Archive, Pin, Trash, Search, X,
  Trash2, Lock, Library, MessageSquare, FileUp, File, Link as LinkIcon,
  RefreshCw, Loader2, ArrowUpDown, ArrowDownUp,
} from 'lucide-react';
import { useHistoryState, HistoryDialogs, formatTimeDifference } from 'research-agent-ui';
import type { Chat } from 'research-agent-ui';

// ─── types ───────────────────────────────────────────────────────────────────

type CategoryKey = 'Today' | 'Yesterday' | 'This Week' | 'Older';
type SortMode = 'date' | 'uploadSize';

interface UploadItem {
  fileId: string;
  fileName: string;
  fileExtension: string;
  sizeBytes: number;
  createdAt?: string | number;
}

interface UploadUsage {
  used: number;
  quota: number;
  remaining: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<CategoryKey, React.ReactNode> = {
  Today: <Sun size={14} />,
  Yesterday: <Clock size={14} />,
  'This Week': <CalendarDays size={14} />,
  Older: <Archive size={14} />,
};

function groupChatsByDate(chats: Chat[]): { label: CategoryKey; chats: Chat[] }[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfWeek = new Date(startOfToday.getTime() - 6 * 86400000);

  const groups: Record<CategoryKey, Chat[]> = {
    Today: [], Yesterday: [], 'This Week': [], Older: [],
  };

  for (const chat of chats) {
    const d = new Date(chat.createdAt);
    if (d >= startOfToday) groups['Today'].push(chat);
    else if (d >= startOfYesterday) groups['Yesterday'].push(chat);
    else if (d >= startOfWeek) groups['This Week'].push(chat);
    else groups['Older'].push(chat);
  }

  return (['Today', 'Yesterday', 'This Week', 'Older'] as CategoryKey[])
    .filter((label) => groups[label].length > 0)
    .map((label) => ({ label, chats: groups[label] }));
}

function chatUploadBytes(chat: Chat): number {
  if (!chat.files?.length) return 0;
  return (chat.files as any[]).reduce((sum: number, f: any) => sum + (f.sizeBytes ?? 0), 0);
}

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
};

const formatDate = (createdAt?: string | number): string => {
  if (!createdAt) return '';
  const date = new Date(
    typeof createdAt === 'number' && createdAt < 1e12 ? createdAt * 1000 : createdAt,
  );
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
};

// ─── main page ───────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [tab, setTab] = useState<'history' | 'uploads'>('history');

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Library size={20} className="text-primary" />
        <h1 className="text-xl font-semibold">Library</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
          <MessageSquare size={14} />
          History
        </TabButton>
        <TabButton active={tab === 'uploads'} onClick={() => setTab('uploads')}>
          <FileUp size={14} />
          Uploads
        </TabButton>
      </div>

      {tab === 'history' ? <HistoryTab /> : <UploadsTab />}
    </div>
  );
}

function TabButton({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors duration-200 ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

// ─── History tab ─────────────────────────────────────────────────────────────

function HistoryTab() {
  const state = useHistoryState();
  const [sortMode, setSortMode] = useState<SortMode>('date');

  const sortedChats = useMemo(() => {
    if (sortMode === 'date') return state.displayChats;
    return [...state.displayChats].sort((a, b) => chatUploadBytes(b) - chatUploadBytes(a));
  }, [state.displayChats, sortMode]);

  const grouped = useMemo(
    () => (sortMode === 'date' ? groupChatsByDate(sortedChats) : null),
    [sortedChats, sortMode],
  );

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search chats..."
            value={state.searchQuery}
            onChange={(e) => state.handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 text-sm bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50"
          />
          {state.searchQuery && (
            <button
              onClick={() => state.handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setSortMode(sortMode === 'date' ? 'uploadSize' : 'date')}
            title={sortMode === 'date' ? 'Sort by upload size' : 'Sort by date'}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
              sortMode === 'uploadSize'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {sortMode === 'uploadSize' ? <ArrowDownUp size={14} /> : <ArrowUpDown size={14} />}
            <span className="hidden sm:inline">
              {sortMode === 'uploadSize' ? 'By size' : 'By date'}
            </span>
          </button>
          <button
            onClick={state.toggleIncognito}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
              state.incognito
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
            title={state.incognito ? 'Private mode on' : 'Private mode'}
          >
            <Lock size={14} />
            <span className="hidden sm:inline">Private</span>
          </button>
          {state.chats.length > 0 && !state.loading && (
            <button
              onClick={state.handleClearAllClick}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors duration-200"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          )}
        </div>
      </div>

      {state.loading || state.searching ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-muted-foreground/30 animate-spin" />
        </div>
      ) : state.searchQuery.trim() && state.displayChats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
          <Search size={32} className="opacity-30" />
          <p className="text-sm">No chats matching &ldquo;{state.searchQuery}&rdquo;</p>
        </div>
      ) : state.chats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <MessageSquare size={40} className="opacity-20" />
          <p className="text-sm">No search history yet.</p>
          <Link href="/" className="text-sm text-primary hover:underline">Start a search</Link>
        </div>
      ) : sortMode === 'uploadSize' || state.searchQuery.trim() ? (
        <div className="space-y-1">
          {sortedChats.map((chat) => (
            <ChatRow
              key={chat.id}
              chat={chat}
              isPinned={state.pinnedIds.includes(chat.id)}
              onTogglePin={state.togglePin}
              onDelete={state.handleDeleteClick}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped!.map(({ label, chats }) => (
            <div key={label}>
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
                {CATEGORY_ICONS[label]}
                {label}
              </div>
              <div className="space-y-1">
                {chats.map((chat) => (
                  <ChatRow
                    key={chat.id}
                    chat={chat}
                    isPinned={state.pinnedIds.includes(chat.id)}
                    onTogglePin={state.togglePin}
                    onDelete={state.handleDeleteClick}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <HistoryDialogs
        deleteDialogOpen={state.deleteDialogOpen}
        setDeleteDialogOpen={state.setDeleteDialogOpen}
        chatToDelete={state.chatToDelete}
        setChatToDelete={state.setChatToDelete}
        deleting={state.deleting}
        onConfirmDelete={state.handleConfirmDelete}
        clearAllDialogOpen={state.clearAllDialogOpen}
        setClearAllDialogOpen={state.setClearAllDialogOpen}
        clearingAll={state.clearingAll}
        onConfirmClearAll={state.handleConfirmClearAll}
      />
    </>
  );
}

// ─── ChatRow ─────────────────────────────────────────────────────────────────

interface ChatRowProps {
  chat: Chat;
  isPinned: boolean;
  onTogglePin: (e: React.MouseEvent, chatId: string) => void;
  onDelete: (e: React.MouseEvent, chatId: string) => void;
}

function ChatRow({ chat, isPinned, onTogglePin, onDelete }: ChatRowProps) {
  const uploadBytes = chatUploadBytes(chat);

  return (
    <div className="group flex items-center gap-2 px-3 py-3 rounded-xl hover:bg-secondary transition-colors duration-200">
      {/* Chats open as a tab on the homepage workspace, not a dedicated `/c/<id>` page. */}
      <Link href={`/?chat=${chat.id}`} className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {isPinned && <Pin size={12} className="inline mr-1.5 text-primary" />}
          {chat.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <div className="flex items-center gap-1">
            <Clock size={12} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {formatTimeDifference(new Date(), chat.createdAt)} ago
            </span>
          </div>
          {(chat.messageCount ?? 0) > 0 && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-xs text-muted-foreground">
                {chat.messageCount} {chat.messageCount === 1 ? 'question' : 'questions'}
              </span>
            </>
          )}
          {uploadBytes > 0 && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <FileUp size={11} className="shrink-0" />
                {formatBytes(uploadBytes)}
              </span>
            </>
          )}
        </div>
      </Link>
      <button
        onClick={(e) => onTogglePin(e, chat.id)}
        className={`p-1.5 rounded-lg transition-all duration-200 ${
          isPinned
            ? 'opacity-100 text-primary hover:bg-primary/10'
            : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary hover:bg-primary/10'
        }`}
        title={isPinned ? 'Unpin' : 'Pin'}
      >
        <Pin size={14} />
      </button>
      <button
        onClick={(e) => onDelete(e, chat.id)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all duration-200"
        title="Delete"
      >
        <Trash size={14} />
      </button>
    </div>
  );
}

// ─── Uploads tab ─────────────────────────────────────────────────────────────

function UploadsTab() {
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [usage, setUsage] = useState<UploadUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedOut, setIsSignedOut] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [sortDesc, setSortDesc] = useState(true);

  const fetchUploads = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await grab('doc/uploads');
      if (data?.files) {
        setFiles(data.files);
        setUsage(data.usage ?? null);
        setIsSignedOut(false);
      } else if (data?.message === 'Sign in to list your uploads') {
        setIsSignedOut(true);
      } else {
        throw new Error(data?.message ?? 'Failed to load uploads');
      }
    } catch (error) {
      console.error('Error fetching uploads:', error);
      toast.error('Failed to load uploads.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchUploads(); }, [fetchUploads]);

  const deleteFiles = async (fileIds: string[] | 'all') => {
    if (deleting) return;
    setDeleting(true);
    try {
      const query =
        fileIds === 'all'
          ? 'doc/uploads?all=true'
          : `doc/uploads?fileId=${encodeURIComponent(fileIds.join(','))}`;
      const data = await grab(query, { method: 'DELETE' });
      if (!data?.success) throw new Error(data?.message ?? 'Delete failed');
      toast.success(
        fileIds === 'all'
          ? 'All uploads deleted.'
          : `Deleted ${fileIds.length} file${fileIds.length === 1 ? '' : 's'}.`,
      );
      setSelected(new Set());
      await fetchUploads();
    } catch (error) {
      console.error('Error deleting uploads:', error);
      toast.error('Failed to delete uploads.');
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelected = (fileId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const sortedFiles = useMemo(
    () => [...files].sort((a, b) => sortDesc ? b.sizeBytes - a.sizeBytes : a.sizeBytes - b.sizeBytes),
    [files, sortDesc],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-muted-foreground/50" size={24} />
      </div>
    );
  }

  if (isSignedOut) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Sign in to view and manage your uploaded files.
      </p>
    );
  }

  const used = usage?.used ?? 0;
  const quota = usage?.quota ?? 1;
  const percentage = Math.min(100, Math.round((used / quota) * 100));

  return (
    <div className="flex flex-col gap-5">
      {/* Storage usage bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Storage used</p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(used)} of {formatBytes(quota)} ({percentage}%)
          </p>
        </div>
        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${percentage >= 90 ? 'bg-red-500' : 'bg-primary'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {files.length} file{files.length === 1 ? '' : 's'}
          {selected.size > 0 ? ` · ${selected.size} selected` : ''}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortDesc((d) => !d)}
            title={sortDesc ? 'Sort: largest first' : 'Sort: smallest first'}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            {sortDesc ? <ArrowDownUp size={13} /> : <ArrowUpDown size={13} />}
            <span>{sortDesc ? 'Largest first' : 'Smallest first'}</span>
          </button>
          <button
            onClick={fetchUploads}
            disabled={deleting}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
          {selected.size > 0 && (
            <button
              onClick={() => deleteFiles(Array.from(selected))}
              disabled={deleting}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors duration-200"
            >
              <Trash2 size={13} />
              <span>Delete selected</span>
            </button>
          )}
          {files.length > 0 && (
            <button
              onClick={() => deleteFiles('all')}
              disabled={deleting}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors duration-200"
            >
              <Trash2 size={13} />
              <span>Delete all</span>
            </button>
          )}
        </div>
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <FileUp size={40} className="opacity-20" />
          <p className="text-sm">No uploads yet. Attach files or URLs in chat to add context.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border border border-border rounded-xl overflow-hidden">
          {sortedFiles.map((file) => (
            <div
              key={file.fileId}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/50 transition-colors duration-200"
            >
              <input
                type="checkbox"
                checked={selected.has(file.fileId)}
                onChange={() => toggleSelected(file.fileId)}
                className="accent-primary shrink-0"
              />
              {file.fileExtension === 'url' ? (
                <LinkIcon size={16} className="shrink-0 text-muted-foreground" />
              ) : (
                <File size={16} className="shrink-0 text-muted-foreground" />
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <p className="text-sm truncate">{file.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {file.fileExtension.toUpperCase()} · {formatBytes(file.sizeBytes)}
                  {formatDate(file.createdAt) ? ` · ${formatDate(file.createdAt)}` : ''}
                </p>
              </div>
              <button
                onClick={() => deleteFiles([file.fileId])}
                disabled={deleting}
                className="text-muted-foreground/50 hover:text-red-500 transition-colors duration-200 shrink-0"
                title="Delete file"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
