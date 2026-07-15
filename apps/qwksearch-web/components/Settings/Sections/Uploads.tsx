/**
 * Settings section for managing file uploads stored in Cloudflare R2.
 * Shows total storage usage against the 1 GB per-user quota, lists every
 * uploaded file with its size in MB, and supports selecting multiple
 * uploads for mass deletion (or deleting everything at once).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { File, Link, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import grab from 'grab-url';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

interface UploadItem {
  fileId: string;
  fileName: string;
  fileExtension: string;
  size: number;
  createdAt: number;
}

interface UploadsResponse {
  files: UploadItem[];
  usageBytes: number;
  quotaBytes: number;
}

const formatSize = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};

const Uploads = (_props: { fields?: any; values?: any }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [usageBytes, setUsageBytes] = useState(0);
  const [quotaBytes, setQuotaBytes] = useState(1024 * 1024 * 1024);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchUploads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data: UploadsResponse & { message?: string } =
        await grab('doc/uploads');
      if (!Array.isArray(data?.files)) {
        throw new Error(data?.message || 'Failed to load uploads');
      }
      setFiles(data.files);
      setUsageBytes(data.usageBytes ?? 0);
      setQuotaBytes(data.quotaBytes ?? 1024 * 1024 * 1024);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load uploads');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const toggleSelect = (fileId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) =>
      prev.size === files.length
        ? new Set()
        : new Set(files.map((file) => file.fileId)),
    );
  };

  const deleteUploads = async (fileIds: string[] | 'all') => {
    const count = fileIds === 'all' ? files.length : fileIds.length;
    if (count === 0) return;
    if (
      !window.confirm(
        `Delete ${count} upload${count === 1 ? '' : 's'}? This cannot be undone.`,
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const data =
        fileIds === 'all'
          ? await grab('doc/uploads?all=true', { method: 'DELETE' })
          : await grab('doc/uploads', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileIds }),
            });
      if (!data?.success) {
        throw new Error(data?.message || 'Delete failed');
      }
      toast.success(
        `Deleted ${data.count} upload${data.count === 1 ? '' : 's'}`,
      );
      await fetchUploads();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const usagePercent = Math.min(100, (usageBytes / quotaBytes) * 100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-black/50 dark:text-white/50" />
      </div>
    );
  }

  return (
    <div className="px-6 py-4 flex flex-col space-y-4">
      {/* Storage usage */}
      <div className="rounded-lg border border-light-200 dark:border-dark-200 p-4">
        <div className="flex flex-row items-center justify-between mb-2">
          <p className="text-sm font-medium text-black dark:text-white">
            Storage used
          </p>
          <p className="text-xs text-black/60 dark:text-white/60">
            {formatSize(usageBytes)} of {formatSize(quotaBytes)}
          </p>
        </div>
        <div className="h-2 w-full rounded-full bg-light-200 dark:bg-dark-200 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              usagePercent > 90 ? 'bg-red-500' : 'bg-sky-500',
            )}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <p className="text-[11px] text-black/50 dark:text-white/50 mt-2">
          Uploads (PDF, DOCX, TXT, MD, HTML, and extracted links) are stored
          in Cloudflare R2 with a 1 GB limit per account.
        </p>
      </div>

      {error && (
        <div className="flex flex-row items-center justify-between rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-3 py-2">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchUploads}
            className="text-xs text-red-600 dark:text-red-400 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-row items-center justify-between">
        <label className="flex flex-row items-center space-x-2 text-sm text-black/70 dark:text-white/70 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={files.length > 0 && selected.size === files.length}
            onChange={toggleSelectAll}
            disabled={files.length === 0}
            className="accent-sky-500"
          />
          <span>
            {selected.size > 0
              ? `${selected.size} selected`
              : `Select all (${files.length})`}
          </span>
        </label>
        <div className="flex flex-row items-center space-x-2">
          <button
            onClick={fetchUploads}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-black/50 dark:text-white/50 hover:bg-light-200 hover:dark:bg-dark-200 transition duration-200"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => deleteUploads(Array.from(selected))}
            disabled={isDeleting || selected.size === 0}
            className={cn(
              'flex flex-row items-center space-x-1 px-3 py-1.5 rounded-lg text-xs transition duration-200',
              selected.size > 0
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-light-200 dark:bg-dark-200 text-black/40 dark:text-white/40 cursor-not-allowed',
            )}
          >
            {isDeleting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Trash2 size={13} />
            )}
            <span>Delete selected</span>
          </button>
          <button
            onClick={() => deleteUploads('all')}
            disabled={isDeleting || files.length === 0}
            className={cn(
              'flex flex-row items-center space-x-1 px-3 py-1.5 rounded-lg text-xs transition duration-200',
              files.length > 0
                ? 'border border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40'
                : 'border border-light-200 dark:border-dark-200 text-black/40 dark:text-white/40 cursor-not-allowed',
            )}
          >
            <Trash2 size={13} />
            <span>Delete all</span>
          </button>
        </div>
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-black/50 dark:text-white/50">
          <File size={28} className="mb-2" />
          <p className="text-sm">No uploads yet</p>
          <p className="text-xs mt-1">
            Attach files or paste a URL in chat to add documents.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-light-200 dark:divide-dark-200 rounded-lg border border-light-200 dark:border-dark-200 overflow-hidden">
          {files.map((file) => (
            <label
              key={file.fileId}
              className={cn(
                'flex flex-row items-center space-x-3 px-3 py-2.5 cursor-pointer transition duration-150',
                selected.has(file.fileId)
                  ? 'bg-sky-50 dark:bg-sky-950/30'
                  : 'hover:bg-light-100 hover:dark:bg-dark-100',
              )}
            >
              <input
                type="checkbox"
                checked={selected.has(file.fileId)}
                onChange={() => toggleSelect(file.fileId)}
                className="accent-sky-500"
              />
              <div className="bg-light-200 dark:bg-dark-200 flex items-center justify-center w-8 h-8 rounded-md shrink-0">
                {file.fileExtension === 'url' ? (
                  <Link size={14} className="text-black/60 dark:text-white/60" />
                ) : (
                  <File size={14} className="text-black/60 dark:text-white/60" />
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <p className="text-sm text-black/90 dark:text-white/90 truncate">
                  {file.fileName}
                </p>
                <p className="text-[11px] text-black/50 dark:text-white/50">
                  {file.fileExtension.toUpperCase()} ·{' '}
                  {new Date(file.createdAt * 1000).toLocaleDateString()}
                </p>
              </div>
              <p className="text-xs text-black/60 dark:text-white/60 shrink-0">
                {formatSize(file.size)}
              </p>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default Uploads;
