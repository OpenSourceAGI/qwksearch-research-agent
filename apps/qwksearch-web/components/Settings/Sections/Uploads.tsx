/**
 * Settings section for managing uploaded files stored in R2: shows storage
 * usage against the per-user quota with a progress bar, lists uploads with
 * sizes, and supports deleting individual files, a selection, or everything.
 */
import React, { useCallback, useEffect, useState } from 'react';
import grab from 'grab-url';
import { toast } from 'sonner';
import { File, Link, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

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

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / Math.pow(1024, i);
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
};

const formatDate = (createdAt?: string | number): string => {
  if (!createdAt) return '';
  const date = new Date(
    typeof createdAt === 'number' && createdAt < 1e12
      ? createdAt * 1000
      : createdAt,
  );
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
};

const Uploads = (_props: { fields?: any; values?: any }) => {
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [usage, setUsage] = useState<UploadUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedOut, setIsSignedOut] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const deleteFiles = async (fileIds: string[] | 'all') => {
    if (deleting) return;
    setDeleting(true);
    try {
      const query =
        fileIds === 'all'
          ? 'doc/uploads?all=true'
          : `doc/uploads?fileId=${encodeURIComponent(fileIds.join(','))}`;
      const data = await grab(query, { method: 'DELETE' });
      if (!data?.success) {
        throw new Error(data?.message ?? 'Delete failed');
      }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-black/50 dark:text-white/50" size={20} />
      </div>
    );
  }

  if (isSignedOut) {
    return (
      <div className="px-6 py-4">
        <p className="text-sm text-black/50 dark:text-white/50">
          Sign in to view and manage your uploaded files.
        </p>
      </div>
    );
  }

  const used = usage?.used ?? 0;
  const quota = usage?.quota ?? 1;
  const percentage = Math.min(100, Math.round((used / quota) * 100));

  return (
    <div className="px-6 py-4 flex flex-col space-y-5">
      {/* Storage usage */}
      <div className="flex flex-col space-y-2">
        <div className="flex flex-row items-center justify-between">
          <p className="text-sm font-medium text-black dark:text-white">
            Storage used
          </p>
          <p className="text-xs text-black/50 dark:text-white/50">
            {formatBytes(used)} of {formatBytes(quota)} ({percentage}%)
          </p>
        </div>
        <div className="h-2 w-full rounded-full bg-light-200 dark:bg-dark-200 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              percentage >= 90 ? 'bg-red-500' : 'bg-sky-500',
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Bulk actions */}
      <div className="flex flex-row items-center justify-between">
        <p className="text-xs text-black/50 dark:text-white/50">
          {files.length} file{files.length === 1 ? '' : 's'}
          {selected.size > 0 ? ` · ${selected.size} selected` : ''}
        </p>
        <div className="flex flex-row items-center space-x-3">
          <button
            onClick={fetchUploads}
            disabled={deleting}
            className="flex flex-row items-center space-x-1 text-xs text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition duration-200"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
          {selected.size > 0 && (
            <button
              onClick={() => deleteFiles(Array.from(selected))}
              disabled={deleting}
              className="flex flex-row items-center space-x-1 text-xs text-red-500 hover:text-red-600 transition duration-200"
            >
              <Trash2 size={13} />
              <span>Delete selected</span>
            </button>
          )}
          {files.length > 0 && (
            <button
              onClick={() => deleteFiles('all')}
              disabled={deleting}
              className="flex flex-row items-center space-x-1 text-xs text-red-500 hover:text-red-600 transition duration-200"
            >
              <Trash2 size={13} />
              <span>Delete all</span>
            </button>
          )}
        </div>
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50 py-4">
          No uploads yet. Attach files or URLs in chat to add context.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-light-200 dark:divide-dark-200 border border-light-200 dark:border-dark-200 rounded-lg overflow-hidden">
          {files.map((file) => (
            <div
              key={file.fileId}
              className="flex flex-row items-center space-x-3 px-3 py-2.5 hover:bg-light-secondary dark:hover:bg-dark-secondary transition duration-200"
            >
              <input
                type="checkbox"
                checked={selected.has(file.fileId)}
                onChange={() => toggleSelected(file.fileId)}
                className="accent-sky-500"
              />
              {file.fileExtension === 'url' ? (
                <Link size={16} className="shrink-0 text-black/50 dark:text-white/50" />
              ) : (
                <File size={16} className="shrink-0 text-black/50 dark:text-white/50" />
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <p className="text-sm text-black dark:text-white truncate">
                  {file.fileName}
                </p>
                <p className="text-xs text-black/50 dark:text-white/50">
                  {file.fileExtension.toUpperCase()} · {formatBytes(file.sizeBytes)}
                  {formatDate(file.createdAt)
                    ? ` · ${formatDate(file.createdAt)}`
                    : ''}
                </p>
              </div>
              <button
                onClick={() => deleteFiles([file.fileId])}
                disabled={deleting}
                className="text-black/40 dark:text-white/40 hover:text-red-500 dark:hover:text-red-500 transition duration-200"
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
};

export default Uploads;
