/**
 * @module SidebarContent
 * @description Renders the panel body of a sidebar (left or right). Stacks
 * any combination of the "files", "openTabs", "outline", and "ai" panels
 * vertically in a resizable split when more than one is active, matching
 * whatever `panels` list the {@link SidebarViewMenu} has configured for
 * that side.
 */
import { RefObject, useState, useCallback, useMemo, useRef } from 'react';
import { FileTree } from '../../file-tree';
import { OutlineView, type OutlineViewHandle } from '../../search/OutlineView';
import { AIRewriteSuggestion } from '../../features/ai-rewrite/AIRewriteSuggestion';
import { Input } from '../../app-ui/input';
import { Document } from '../../documents/DocumentTree';
import type { SidebarPanelType, SidebarAiProps, OpenTabItem } from './types';
import type { TocEntry } from '../../app-types/toc';
import { SplitPane, Pane } from 'react-split-pane';
import { usePersistence } from 'react-split-pane/persistence';
import { ssrSafeLocalStorage } from '../../utils/storage';
import { X, Edit2, RotateCcw, SplitSquareVertical, Loader2, Search, MessageSquare, FilePlus2, MessageSquarePlus } from 'lucide-react';
import { FileTypeIcon } from '../../app-ui/FileTypeIcon';
import { cn } from '../../app-utils/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../../app-ui/context-menu';
import '../../app-styles/split-pane.css';

type DocumentTreeHandle = { collapseAll: () => void; edit: (nodeId: string) => void; expandAll: () => void; expandToLevel: (level: number) => void; cancelExpand: () => void };

/** Human-readable panel titles used in headers/empty states. */
const PANEL_TITLES: Record<SidebarPanelType, string> = {
  ai: 'AI Suggestions',
  files: 'Files',
  outline: 'Outline',
  openTabs: 'Open Tabs',
};

/** Props for the {@link SidebarContent} component. */
interface SidebarContentProps {
  /** Which panels are active on this side, in stacking order. */
  panels: SidebarPanelType[];
  /** Whether multiple panels may be shown stacked at once. */
  split: boolean;
  /** Storage key suffix so left/right panel sizes persist independently. */
  persistenceKey: string;
  /** Filtered/flat document list to pass down to the file tree. */
  activeDocuments: Document[];
  /** Heading entries from the Tiptap table of contents. */
  headings?: TocEntry[];
  /** ID of the currently active/selected document. */
  activeId: string | null;
  /** The full `Document` object for `activeId` (used for outline section search). */
  activeDocument?: Document;
  /** Whether the sidebar is being displayed in a mobile sheet. */
  isMobile?: boolean;
  /** Selects a document by ID; closes the mobile sheet when on mobile. */
  onSelect: (id: string) => void;
  /** Creates a new note or folder under `parentId`. */
  onAdd: (parentId: string | null, isFolder?: boolean) => void;
  /** Soft-deletes a document by ID. */
  onDelete: (id: string) => void;
  /** Duplicates a document by ID. */
  onDuplicate: (id: string) => void;
  /** Moves a document in the tree via drag-and-drop. */
  onMove: (draggedId: string, targetId: string | null, position: 'before' | 'after' | 'child') => void;
  /** Opens the tag management UI for a document. */
  onManageTags?: (id: string) => void;
  /** Renames a document. */
  onRename?: (id: string, newTitle: string) => void;
  /** Callback to control the mobile sidebar sheet open state. */
  onOpenChange?: (open: boolean) => void;
  /** Ref forwarded to the `FileTree` component for imperative control. */
  treeRef?: RefObject<DocumentTreeHandle | null>;
  /** Ref forwarded to the `OutlineView` component for imperative control. */
  outlineRef?: RefObject<OutlineViewHandle | null>;
  /** Currently open tab IDs shown in the top pane. */
  openTabs?: string[];
  /** ID of the currently active tab. */
  activeTab?: string | null;
  /** Switches to a tab. */
  onTabChange?: (id: string) => void;
  /** Closes a tab. */
  onTabClose?: (id: string) => void;
  /** Renames a tab's document. */
  onTabRename?: (id: string, newTitle: string) => void;
  /** Opens a tab in a split view to the right. */
  onSplitRight?: (id: string) => void;
  /** Reopens the last closed tab. */
  onReopenLastClosed?: () => void;
  /** Whether there is a closed tab that can be reopened. */
  canReopenLastClosed?: boolean;
  /** Navigates the editor to a heading (used by the "outline" panel). */
  onNavigate?: (key: string) => void;
  /** AI suggestion state/handlers (used by the "ai" panel). */
  aiProps?: SidebarAiProps;
  /** Unified tab list (files + chats). Overrides file-only tab derivation when set. */
  tabItems?: OpenTabItem[];
  /** Opens a new chat tab from the "Open Tabs" panel header. */
  onNewChat?: () => void;
}

/**
 * Renders the enabled panels for one side of the layout, stacked in a
 * resizable vertical split when more than one panel is active.
 */
export const SidebarContent = ({
  panels,
  split,
  persistenceKey,
  activeDocuments,
  activeId,
  activeDocument,
  headings = [],
  isMobile,
  onSelect,
  onAdd,
  onDelete,
  onDuplicate,
  onMove,
  onManageTags,
  onRename,
  onOpenChange,
  treeRef,
  outlineRef,
  openTabs = [],
  activeTab,
  onTabChange,
  onTabClose,
  onTabRename,
  onSplitRight,
  onReopenLastClosed,
  canReopenLastClosed = false,
  onNavigate,
  aiProps,
  tabItems,
  onNewChat,
}: SidebarContentProps) => {
  // Track copied document for copy/paste operations
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);
  const [outlineFilter, setOutlineFilter] = useState('');

  const internalTreeRef = useRef<DocumentTreeHandle>(null);
  const internalOutlineRef = useRef<OutlineViewHandle>(null);
  const effectiveTreeRef = treeRef ?? internalTreeRef;
  const effectiveOutlineRef = outlineRef ?? internalOutlineRef;

  const handleSelect = (id: string) => {
    onSelect(id);
    if (isMobile && onOpenChange) {
      onOpenChange(false);
    }
  };

  const handleManageTags = (id: string) => {
    onManageTags?.(id);
    if (isMobile && onOpenChange) {
      onOpenChange(false);
    }
  };

  const handleCopy = useCallback((id: string) => {
    setCopiedDocId(id);
  }, []);

  const handlePaste = useCallback((_targetId: string | null) => {
    if (!copiedDocId) return;
    onDuplicate(copiedDocId);
  }, [copiedDocId, onDuplicate]);

  // Build per-heading body text from HTML so we can search inside sections
  const sectionBodies = useMemo<string[]>(() => {
    const documentContent = activeDocument?.content || '';
    if (!documentContent) return [];
    const doc = new DOMParser().parseFromString(documentContent, 'text/html');
    const bodies: string[] = [];
    let currentBody = '';
    let headingIndex = -1;
    for (const el of Array.from(doc.body.children)) {
      if (/^h[1-6]$/i.test(el.tagName)) {
        if (headingIndex >= 0) bodies[headingIndex] = currentBody;
        headingIndex++;
        currentBody = '';
      } else if (headingIndex >= 0) {
        currentBody += ' ' + (el.textContent || '');
      }
    }
    if (headingIndex >= 0) bodies[headingIndex] = currentBody;
    return bodies;
  }, [activeDocument?.content]);

  const filteredHeadings = useMemo<TocEntry[]>(() => {
    const q = outlineFilter.trim().toLowerCase();
    if (!q) return headings;
    return headings.filter(([, text], i) =>
      text.toLowerCase().includes(q) ||
      (sectionBodies[i] || '').toLowerCase().includes(q)
    );
  }, [outlineFilter, headings, sectionBodies]);

  const [panelSizes, setPanelSizes] = usePersistence({
    key: `sidebar-panels-${persistenceKey}`,
    storage: ssrSafeLocalStorage,
  });

  // Fall back to file-only tabs derived from `openTabs`/`activeDocuments`
  // when the host app hasn't supplied a unified `tabItems` list.
  const resolvedTabItems: OpenTabItem[] = tabItems ?? openTabs.map((tabId) => ({
    id: tabId,
    title: activeDocuments.find(d => d.id === tabId)?.title || 'Untitled',
    kind: 'file' as const,
  }));

  const renderOpenTabs = () => (
    <div className="h-full overflow-auto">
      <div className="px-1 py-1">
        <div className="flex items-center justify-between px-2 py-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Open Tabs</p>
          <div className="flex items-center gap-0.5">
            <button
              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              title="New File"
              onClick={() => onAdd(null, false)}
            >
              <FilePlus2 className="h-3.5 w-3.5" />
            </button>
            {onNewChat && (
              <button
                className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                title="New Chat"
                onClick={onNewChat}
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        {resolvedTabItems.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">No open tabs</div>
        ) : (
          resolvedTabItems.map(({ id: tabId, title, kind }) => {
            const isActive = tabId === activeTab;
            const isChat = kind === 'chat';
            return (
              <ContextMenu key={tabId}>
                <ContextMenuTrigger>
                  <div
                    className={cn(
                      'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-sidebar-accent',
                      isActive && 'bg-sidebar-accent text-blue-600 font-medium'
                    )}
                    onClick={() => onTabChange?.(tabId)}
                  >
                    {isChat ? (
                      <MessageSquare className="shrink-0 h-4 w-4 text-blue-500" />
                    ) : (
                      <FileTypeIcon filename={title} size={16} />
                    )}
                    <span className="flex-1 truncate text-sm">{title}</span>
                    {onTabClose && (
                      <button
                        className="shrink-0 h-4 w-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTabClose(tabId);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  {onTabRename && !isChat && (
                    <ContextMenuItem onClick={() => {
                      const newTitle = window.prompt('Rename document', title);
                      if (newTitle?.trim()) onTabRename(tabId, newTitle.trim());
                    }}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Rename
                    </ContextMenuItem>
                  )}
                  {onTabClose && (
                    <ContextMenuItem
                      onClick={() => onTabClose(tabId)}
                      className="text-destructive focus:text-destructive"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Close
                    </ContextMenuItem>
                  )}
                  {!isChat && (onSplitRight || onReopenLastClosed) && <ContextMenuSeparator />}
                  {onSplitRight && !isChat && (
                    <ContextMenuItem onClick={() => onSplitRight(tabId)}>
                      <SplitSquareVertical className="mr-2 h-4 w-4" />
                      Split Right
                    </ContextMenuItem>
                  )}
                  {onReopenLastClosed && !isChat && (
                    <ContextMenuItem
                      onClick={onReopenLastClosed}
                      disabled={!canReopenLastClosed}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reopen Last Closed
                    </ContextMenuItem>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            );
          })
        )}
      </div>
    </div>
  );

  const renderFiles = () => (
    <div className="h-full overflow-auto">
      <FileTree
        ref={effectiveTreeRef}
        documents={activeDocuments}
        activeId={activeId}
        onSelect={handleSelect}
        onMove={onMove}
        onRename={onRename}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onAddChild={(parentId) => onAdd(parentId, false)}
        onAddChildFolder={(parentId) => onAdd(parentId, true)}
        onAddSibling={(itemId) => {
          const item = activeDocuments.find(d => d.id === itemId);
          onAdd(item?.parentId || null, false);
        }}
        onAddSiblingFolder={(itemId) => {
          const item = activeDocuments.find(d => d.id === itemId);
          onAdd(item?.parentId || null, true);
        }}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onManageTags={handleManageTags}
      />
    </div>
  );

  const renderOutline = () => (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-sidebar-border shrink-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Outline</p>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={outlineFilter}
            onChange={(e) => setOutlineFilter(e.target.value)}
            placeholder="Filter headings & text…"
            className="h-7 pl-7 pr-7 text-xs"
          />
          {outlineFilter && (
            <button
              onClick={() => setOutlineFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <OutlineView
          ref={effectiveOutlineRef}
          headings={filteredHeadings}
          searchQuery={outlineFilter}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );

  const renderAi = () => (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-sidebar-border shrink-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI Suggestions</p>
      </div>
      <div className="flex-1 overflow-hidden">
        {aiProps?.isAiLoading ? (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Generating AI suggestion...</p>
            </div>
          </div>
        ) : aiProps?.aiSuggestion ? (
          <AIRewriteSuggestion
            originalText={aiProps.aiSuggestion.originalText}
            suggestedText={aiProps.aiSuggestion.suggestedText}
            onApprove={() => aiProps.onAiApprove?.()}
            onReject={() => aiProps.onAiReject?.()}
            onRegenerate={(mode) => aiProps.onAiRegenerate?.(mode)}
            currentMode={aiProps.aiSuggestion.mode}
            isLoading={false}
          />
        ) : (
          <div className="h-full flex items-center justify-center p-6 text-center">
            <p className="text-sm text-muted-foreground">Select text and click the AI button to get suggestions</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderPanel = (type: SidebarPanelType) => {
    switch (type) {
      case 'files': return renderFiles();
      case 'openTabs': return renderOpenTabs();
      case 'outline': return renderOutline();
      case 'ai': return renderAi();
    }
  };

  if (panels.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">No panels enabled</p>
      </div>
    );
  }

  if (panels.length === 1 || !split) {
    return <div className="h-full">{renderPanel(panels[0])}</div>;
  }

  return (
    <div className="h-full">
      <SplitPane direction="vertical" onResize={setPanelSizes}>
        {panels.map((type, i) => (
          <Pane key={type} size={panelSizes?.[i] || `${Math.round(100 / panels.length)}%`} minSize="0px">
            {renderPanel(type)}
          </Pane>
        ))}
      </SplitPane>
    </div>
  );
};
