/**
 * Settings dropdown combining search category, thinking-time limit, model selector, file upload from device/folder/Google Drive,
 * private mode toggle, and links to History and Settings pages.
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Upload, CloudIcon, FolderOpen, Loader2, Clock, SlidersHorizontal, Paperclip, History, Settings, EyeOff, Share2, Link, FileText, FileType, FileDown, FileSpreadsheet, BookMarked } from 'lucide-react';
import { useRouter } from 'next/navigation';
import grab from 'grab-url';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../../ui/dropdown-menu';
import { cn } from '../../lib/utils';
import { useGooglePicker } from './GoogleDrivePicker';
import { useChat } from '../../hooks/useChat';
import { categories } from '../SearchConfig/categories';
import { ModelSelectorSubmenu } from '../SearchConfig/ModelSelectorSubmenu';
import { exportAsMarkdown, exportAsDocx, exportAsPdf, exportToGoogleDocs } from '../../lib/export';
import { useSession } from '../../hooks/useSession';

interface FileUploadDropdownProps {
  onFileSelect: (files: FileList | File[]) => void;
  disabled?: boolean;
}

const THINKING_OPTIONS = [
  { label: '5s', value: 5 },
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '45s', value: 45 },
  { label: '60s', value: 60 },
  { label: 'Unlimited', value: 0 },
];

const SUPPORTED_EXTS = ['pdf', 'docx', 'txt', 'html', 'htm'];
const TEXT_EXTS = [
  'md', 'markdown', 'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'go', 'rs',
  'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'swift', 'kt', 'sh', 'bash',
  'zsh', 'json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'xml',
  'csv', 'tsv', 'log', 'env', 'sql', 'graphql', 'vue', 'svelte', 'astro',
  'css', 'scss', 'less', 'sass', 'tex', 'bib', 'rst', 'adoc', 'org',
];

const FileUploadDropdown: React.FC<FileUploadDropdownProps> = ({
  onFileSelect,
  disabled = false,
}) => {
  const router = useRouter();
  const { category, setCategory, incognito, setIncognito, sections, chatId } = useChat();
  const { isAuthenticated } = useSession();
  const selectedCodes = category ? category.split(',').filter(Boolean) : ['general'];
  const primaryCategory = categories.find((cat) => cat.code === selectedCodes[0]) || categories[0];

  const toggleCategory = (code: string) => {
    const current = category ? category.split(',').filter(Boolean) : ['general'];
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    setCategory(next.length > 0 ? next.join(',') : 'general');
  };

  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isScanningFolder, setIsScanningFolder] = useState(false);
  const [thinkingTimeLimit, setThinkingTimeLimit] = useState<number>(() => {
    if (typeof window === 'undefined') return 5;
    const n = Number(localStorage.getItem('thinkingTimeLimit') ?? '5');
    return Number.isFinite(n) ? n : 5;
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { openPicker } = useGooglePicker();

  useEffect(() => {
    checkGoogleDriveConnection();
  }, []);

  const checkGoogleDriveConnection = async () => {
    try {
      const data = await grab('/api/doc/google-docs/auth/status');
      setIsGoogleDriveConnected(data.isConnected || false);
    } catch {
      // silently ignore
    }
  };

  const handleThinkingTimeLimit = (value: number) => {
    setThinkingTimeLimit(value);
    localStorage.setItem('thinkingTimeLimit', String(value));
  };

  const handleLocalFileUpload = async () => {
    if ('showOpenFilePicker' in window) {
      try {
        const fileHandles = await (window as any).showOpenFilePicker({
          multiple: true,
          types: [
            {
              description: 'Supported files',
              accept: {
                'application/pdf': ['.pdf'],
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                'text/plain': ['.txt'],
                'text/html': ['.html', '.htm'],
                'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
              },
            },
          ],
        });
        const files: File[] = await Promise.all(
          fileHandles.map((handle: FileSystemFileHandle) => handle.getFile()),
        );
        if (files.length > 0) onFileSelect(files);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Failed to open file picker:', err);
          fileInputRef.current?.click();
        }
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  async function collectFilesFromDirectory(
    dirHandle: FileSystemDirectoryHandle,
    path = '',
  ): Promise<File[]> {
    const files: File[] = [];
    for await (const entry of (dirHandle as any).values()) {
      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        if (SUPPORTED_EXTS.includes(ext)) {
          files.push(file);
        } else if (TEXT_EXTS.includes(ext)) {
          try {
            const text = await file.text();
            const displayName = path ? `${path}/${file.name}` : file.name;
            files.push(new File([text], `${displayName.replace(/[/\\]/g, '_')}.txt`, { type: 'text/plain' }));
          } catch {
            // skip unreadable files
          }
        }
      } else if (entry.kind === 'directory') {
        const subDir = entry as FileSystemDirectoryHandle;
        if (subDir.name.startsWith('.') || subDir.name === 'node_modules' || subDir.name === '__pycache__') continue;
        files.push(...await collectFilesFromDirectory(subDir, path ? `${path}/${subDir.name}` : subDir.name));
      }
    }
    return files;
  }

  const handleLocalFolderAccess = async () => {
    if (!('showDirectoryPicker' in window)) {
      alert('Your browser does not support the File System Access API. Please use Chrome or Edge.');
      return;
    }
    setIsScanningFolder(true);
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
      const files = await collectFilesFromDirectory(dirHandle);
      if (files.length > 0) {
        onFileSelect(files);
      } else {
        alert('No supported files found in the selected folder.');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('Failed to access folder:', err);
    } finally {
      setIsScanningFolder(false);
    }
  };

  const handleGoogleDriveConnect = async () => {
    setIsConnecting(true);
    try {
      const data = await grab('doc/google-docs/auth');
      if (data.success && data.data?.authUrl) {
        const width = 600, height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(data.data.authUrl, 'Google Drive Authorization', `width=${width},height=${height},left=${left},top=${top}`);
        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'google-drive-connected') {
            setIsGoogleDriveConnected(true);
            popup?.close();
            window.removeEventListener('message', handleMessage);
          }
        };
        window.addEventListener('message', handleMessage);
      }
    } catch {
      console.error('Failed to connect to Google Drive');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleGoogleDriveUpload = async () => {
    try {
      const tokenData = await grab('doc/google-docs/token');
      if (!tokenData.success || !tokenData.accessToken) throw new Error('Failed to get access token');
      await openPicker(
        tokenData.accessToken,
        async (files) => {
          setIsLoadingFiles(true);
          try {
            const fileObjects: File[] = [];
            for (const file of files) {
              const data = await grab(`/api/doc/google-docs/files?fileId=${file.id}`);
              if (data.success && data.file) {
                const content = atob(data.file.content);
                const bytes = new Uint8Array(content.length);
                for (let i = 0; i < content.length; i++) bytes[i] = content.charCodeAt(i);
                fileObjects.push(new File([new Blob([bytes], { type: data.file.mimeType })], data.file.name, { type: data.file.mimeType }));
              }
            }
            if (fileObjects.length > 0) onFileSelect(fileObjects);
          } catch {
            alert('Failed to load files from Google Drive');
          } finally {
            setIsLoadingFiles(false);
          }
        },
        (error) => { console.error('Google Picker error:', error); alert(error); }
      );
    } catch (error: any) {
      alert(error.message || 'Failed to open Google Drive picker');
    }
  };

  const currentThinkingLabel = THINKING_OPTIONS.find((o) => o.value === thinkingTimeLimit)?.label ?? 'Unlimited';

  return (
    <>
      <div className="relative flex shrink min-w-8 !shrink-0 group">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={disabled}
              className="inline-flex items-center justify-center relative shrink-0 transition-colors duration-200 h-8 w-8 rounded-lg active:scale-95 text-text-400 hover:text-text-200 hover:bg-bg-200 disabled:opacity-50 disabled:cursor-not-allowed group-active:scale-95"
              type="button"
              aria-label="Search options"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            side="top"
            sideOffset={8}
            className="w-44"
          >
            {/* Categories flyout submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                {primaryCategory && <primaryCategory.icon className="w-4 h-4 flex-shrink-0" />}
                <span>Category</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-44">
                <DropdownMenuCheckboxItem
                  checked={selectedCodes.length === 0}
                  onCheckedChange={() => setCategory('general')}
                  onSelect={(e) => e.preventDefault()}
                  className="gap-2"
                >
                  <div className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>None</span>
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {categories.map((cat) => (
                  <DropdownMenuCheckboxItem
                    key={cat.code}
                    checked={selectedCodes.includes(cat.code)}
                    onCheckedChange={() => toggleCategory(cat.code)}
                    onSelect={(e) => e.preventDefault()}
                    className="gap-2"
                  >
                    {cat.icon && <cat.icon className="w-3.5 h-3.5 flex-shrink-0" />}
                    <span>{cat.name}</span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Thinking Time flyout submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                <Clock className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                <span>Speed</span>
                <span className="ml-auto text-xs text-muted-foreground">{currentThinkingLabel}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-36">
                {THINKING_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onSelect={() => handleThinkingTimeLimit(opt.value)}
                    className={cn('justify-between', thinkingTimeLimit === opt.value && 'bg-secondary')}
                  >
                    <span>{opt.label}</span>
                    {thinkingTimeLimit === opt.value && (
                      <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 10 10">
                        <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <ModelSelectorSubmenu />

            <DropdownMenuSeparator />

            {/* Upload from flyout submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                <Upload className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                <span>Upload</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-44">
                <DropdownMenuItem onSelect={handleLocalFileUpload} className="gap-2">
                  <Upload className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Your Device</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onSelect={handleLocalFolderAccess}
                  disabled={isScanningFolder}
                  className="gap-2"
                >
                  {isScanningFolder
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
                    : <FolderOpen className="h-3.5 w-3.5 flex-shrink-0" />}
                  <span>{isScanningFolder ? 'Scanning…' : 'Local Folder'}</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Cloud</DropdownMenuLabel>

                {isGoogleDriveConnected ? (
                  <DropdownMenuItem
                    onSelect={handleGoogleDriveUpload}
                    disabled={isLoadingFiles}
                    className="gap-2"
                  >
                    {isLoadingFiles
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
                      : <CloudIcon className="h-3.5 w-3.5 flex-shrink-0" />}
                    <span>{isLoadingFiles ? 'Loading…' : 'Google Drive'}</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onSelect={handleGoogleDriveConnect}
                    disabled={isConnecting}
                    className="gap-2"
                  >
                    {isConnecting
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
                      : <CloudIcon className="h-3.5 w-3.5 flex-shrink-0" />}
                    <span>{isConnecting ? 'Connecting…' : 'Connect Google Drive'}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <DropdownMenuCheckboxItem
              checked={incognito}
              onCheckedChange={setIncognito}
              onSelect={(e) => e.preventDefault()}
              className="gap-2"
            >
              <EyeOff className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <span>Private</span>
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />

            {/* Share & Export submenu - only show when there are messages */}
            {sections.length > 0 && (
              <>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2">
                    <Share2 className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    <span>Share</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48">
                    <DropdownMenuItem
                      onSelect={async () => {
                        if (!chatId) {
                          toast.error('No chat to share');
                          return;
                        }

                        if (!isAuthenticated) {
                          toast.error('Please sign in to share chats');
                          return;
                        }

                        try {
                          const response = await grab('agent/chats/share', {
                            method: 'POST',
                            body: { chatId },
                          });

                          if (response.success && response.data?.shareUrl) {
                            await navigator.clipboard.writeText(response.data.shareUrl);
                            toast.success('Chat is now public - link copied to clipboard');
                          } else {
                            throw new Error(response.error || 'Failed to share chat');
                          }
                        } catch (err) {
                          console.error('Error sharing chat:', err);
                          const errorMsg = err instanceof Error ? err.message : 'Failed to share chat';
                          toast.error(errorMsg);
                        }
                      }}
                      className="gap-2"
                    >
                      <Link className="w-4 h-4 flex-shrink-0" />
                      <span>Copy link</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={async () => {
                        const title = sections[0]?.userMessage?.content || 'Chat';
                        const content = sections.map(s =>
                          `## ${s.userMessage.content}\n\n${s.assistantMessage?.content || ''}`
                        ).join('\n\n---\n\n');
                        try {
                          await grab('doc/documents', {
                            method: 'POST',
                            body: {
                              title,
                              name: title,
                              content,
                              metadata: { source: 'chat', chatId: window.location.pathname },
                            },
                          });
                          toast.success('Saved to QwkDocs');
                        } catch {
                          toast.error('Failed to save to QwkDocs');
                        }
                      }}
                      className="gap-2"
                    >
                      <BookMarked className="w-4 h-4 flex-shrink-0" />
                      <span>Save to QwkDocs</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => {
                        const title = sections[0]?.userMessage?.content || 'Chat';
                        const html = sections.map(s =>
                          `<h2>${s.userMessage.content}</h2>${s.assistantMessage?.content || ''}`
                        ).join('\n');
                        exportAsMarkdown(title, html);
                      }}
                      className="gap-2"
                    >
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span>Export as Markdown</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        const title = sections[0]?.userMessage?.content || 'Chat';
                        const html = sections.map(s =>
                          `<h2>${s.userMessage.content}</h2>${s.assistantMessage?.content || ''}`
                        ).join('\n');
                        exportAsPdf(title, html);
                      }}
                      className="gap-2"
                    >
                      <FileType className="w-4 h-4 flex-shrink-0" />
                      <span>Export as PDF</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        const title = sections[0]?.userMessage?.content || 'Chat';
                        const html = sections.map(s =>
                          `<h2>${s.userMessage.content}</h2>${s.assistantMessage?.content || ''}`
                        ).join('\n');
                        exportAsDocx(title, html);
                      }}
                      className="gap-2"
                    >
                      <FileDown className="w-4 h-4 flex-shrink-0" />
                      <span>Export as DOCX</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        const title = sections[0]?.userMessage?.content || 'Chat';
                        const html = sections.map(s =>
                          `<h2>${s.userMessage.content}</h2>${s.assistantMessage?.content || ''}`
                        ).join('\n');
                        exportToGoogleDocs(title, html);
                      }}
                      className="gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
                      <span>Export to Google Docs</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem onSelect={() => router.push('/library')} className="gap-2">
              <History className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <span>History</span>
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={() => router.push('/settings')} className="gap-2">
              <Settings className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <span>Settings</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1F1E1D] dark:bg-[#EEEEEC] text-[11px] font-medium rounded-[6px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-sm tracking-wide">
          <span className="text-[#ECECEC] dark:text-[#1F1E1D]">Search options</span>
        </div>
      </div>

      <div className="relative hidden sm:flex shrink-0 group -ml-1">
        <button
          type="button"
          disabled={disabled}
          onClick={handleLocalFileUpload}
          aria-label="Attach files"
          className="inline-flex items-center justify-center relative shrink-0 transition-colors duration-200 h-7 w-7 rounded-md active:scale-95 text-text-400 hover:text-text-200 hover:bg-bg-200 disabled:opacity-50 disabled:cursor-not-allowed group-active:scale-95"
        >
          <Paperclip className="w-[18px] h-[18px]" />
        </button>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1F1E1D] dark:bg-[#EEEEEC] text-[11px] font-medium rounded-[6px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-sm tracking-wide">
          <span className="text-[#ECECEC] dark:text-[#1F1E1D]">Attach files</span>
        </div>
      </div>

      {/* Hidden file input fallback */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => {
          if (e.target.files) {
            onFileSelect(e.target.files);
            e.target.value = '';
          }
        }}
        className="hidden"
      />
    </>
  );
};

export default FileUploadDropdown;
