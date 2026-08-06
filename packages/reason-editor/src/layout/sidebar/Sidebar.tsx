/**
 * @module Sidebar
 * @description Mobile-aware sidebar shell. Renders the toolbar and content
 * inside a Sheet on mobile and directly in the layout on desktop.
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import { DocumentTreeHandle } from '../../file-tree/filetree';
import { OutlineViewHandle } from '../../search/OutlineView';
import { Sheet, SheetContent } from '../../app-ui/sheet';
import { getFileSources } from '../../app-utils/file-sources/sources';
import { AnyFileSource } from '../../app-types/fileSource';
import { FileManagerModal } from '../../dialogs/FileManagerModal';
import { SidebarToolbar } from './SidebarToolbar';
import { SidebarContent } from './SidebarContent';
import type { SidebarProps } from './types';
import { cn } from '../../app-utils/utils';

/** Translucent, blurred glass background — matches the app dock and weather widget. */
const SIDEBAR_GLASS_CLASSES =
  'bg-white/10 dark:bg-black/20 backdrop-blur-md border-white/15 dark:border-white/10';

export const Sidebar = ({
  documents,
  activeId,
  activeDocument,
  onSelect,
  onAdd,
  onDelete,
  onDuplicate,
  onMove,
  onManageTags,
  onRename,
  onSearchFocus,
  isOpen,
  onOpenChange,
  isMobile,
  leftPanels,
  onLeftPanelsChange,
  leftSplit,
  onLeftSplitChange,
  rightPanels,
  onRightPanelsChange,
  rightSplit,
  onRightSplitChange,
  onSettingsClick,
  onRestore,
  newDocumentId,
  showDynamicIsland,
  onToggleDynamicIsland,
  activeFileSourceId = 'local-default',
  onFileSourceChange,
  headings = [],
  onNavigate,
  openTabs = [],
  activeTab,
  onTabChange,
  onTabClose,
  onTabRename,
  onSplitRight,
  onReopenLastClosed,
  canReopenLastClosed = false,
  aiProps,
  tabItems,
  onNewChat,
}: SidebarProps) => {
  const deletedDocs = documents.filter(doc => doc.isDeleted);

  const activeDocuments = documents.filter(doc => !doc.isDeleted);

  // Cycle depth for the file tree's expand-all button: 0 = collapsed, then
  // 1, 2, 3... one folder level at a time, up to the deepest nesting level,
  // before wrapping back to collapsed.
  const [expandLevel, setExpandLevel] = useState(0);
  // Deepest folder nesting level currently in the tree (1 = only top-level folders).
  const maxExpandLevel = useMemo(() => {
    const byId = new Map(activeDocuments.map((doc) => [doc.id, doc]));
    let max = 0;
    for (const doc of activeDocuments) {
      if (!doc.isFolder) continue;
      let depth = 1;
      let parentId = doc.parentId;
      const seen = new Set<string>();
      while (parentId && byId.has(parentId) && !seen.has(parentId)) {
        seen.add(parentId);
        depth++;
        parentId = byId.get(parentId)?.parentId ?? null;
      }
      max = Math.max(max, depth);
    }
    return max;
  }, [activeDocuments]);
  // Clamp to the current max depth if folders were deleted/collapsed elsewhere.
  useEffect(() => {
    setExpandLevel((prev) => Math.min(prev, maxExpandLevel));
  }, [maxExpandLevel]);
  // Track expand/collapse all state for outline
  const [outlineExpanded, setOutlineExpanded] = useState(true);
  // Ref for file tree
  const treeRef = useRef<DocumentTreeHandle>(null);
  // Ref for outline view
  const outlineRef = useRef<OutlineViewHandle>(null);

  // File sources - memoize to prevent infinite loops
  const [sources] = useState<AnyFileSource[]>(() => getFileSources());
  const [activeSource, setActiveSource] = useState<AnyFileSource | null>(() => {
    const loadedSources = getFileSources();
    return loadedSources.find((s) => s.id === activeFileSourceId) || loadedSources[0] || null;
  });

  // File manager modal state
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);

  // Update active source when activeFileSourceId changes
  useEffect(() => {
    const active = sources.find((s) => s.id === activeFileSourceId);
    if (active && active.id !== activeSource?.id) {
      setActiveSource(active);
    }
  }, [activeFileSourceId, activeSource?.id, sources]);

  const handleSourceSelect = (sourceId: string) => {
    const selected = sources.find((s) => s.id === sourceId);
    if (selected) {
      setActiveSource(selected);
      onFileSourceChange?.(sourceId);
    }
  };

  const handleToggleAllExpanded = () => {
    if (maxExpandLevel === 0) return;
    const nextLevel = expandLevel >= maxExpandLevel ? 0 : expandLevel + 1;
    setExpandLevel(nextLevel);
    if (treeRef.current) {
      if (nextLevel === 0) {
        treeRef.current.cancelExpand?.();
        treeRef.current.collapseAll();
      } else {
        treeRef.current.expandToLevel(nextLevel);
      }
    }
  };

  const isFullyExpanded = expandLevel > 0 && expandLevel >= maxExpandLevel;
  const expandToggleLabel =
    expandLevel === 0
      ? maxExpandLevel > 1
        ? 'Expand Level 1'
        : 'Expand All'
      : isFullyExpanded
        ? 'Collapse All'
        : `Expand Level ${expandLevel + 1}`;

  const handleToggleOutlineExpanded = () => {
    const newState = !outlineExpanded;
    setOutlineExpanded(newState);
    if (outlineRef.current) {
      if (newState) {
        outlineRef.current.expandAll();
      } else {
        outlineRef.current.collapseAll();
      }
    }
  };

  // Trigger edit mode for newly created documents
  useEffect(() => {
    if (newDocumentId && treeRef.current) {
      const timer = setTimeout(() => {
        const treeElement = treeRef.current as any;
        if (treeElement && typeof treeElement.edit === 'function') {
          treeElement.edit(newDocumentId);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [newDocumentId]);

  const toolbarProps = {
    leftPanels,
    leftSplit,
    onLeftPanelsChange,
    onLeftSplitChange,
    rightPanels,
    rightSplit,
    onRightPanelsChange,
    onRightSplitChange,
    activeId,
    onAdd,
    onSearchFocus,
    onFileManagerOpen: () => setIsFileManagerOpen(true),
    sources,
    activeSource,
    activeFileSourceId,
    onFileSourceChange,
    onSourceSelect: handleSourceSelect,
    allExpanded: isFullyExpanded,
    expandToggleLabel,
    outlineExpanded,
    onToggleAllExpanded: handleToggleAllExpanded,
    onToggleOutlineExpanded: handleToggleOutlineExpanded,
    treeRef,
    outlineRef,
    deletedDocs,
    onRestore,
    onSettingsClick,
    showDynamicIsland,
    onToggleDynamicIsland,
    isMobile,
    openTabs,
    activeTab,
    onTabChange,
    onTabClose,
    documents,
    tabItems,
  };

  const contentProps = {
    panels: leftPanels,
    split: leftSplit,
    persistenceKey: 'left',
    activeDocuments,
    activeId,
    activeDocument,
    headings,
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
    openTabs,
    activeTab,
    onTabChange,
    onTabClose,
    onTabRename,
    onSplitRight,
    onReopenLastClosed,
    canReopenLastClosed,
    onNavigate,
    aiProps,
    tabItems,
    onNewChat,
  };

  // Mobile: render in a drawer
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="left" className={cn('w-80 p-0', SIDEBAR_GLASS_CLASSES)}>
          <aside className="h-full flex flex-col">
            <SidebarToolbar {...toolbarProps} />
            <div className="flex-1 min-h-0 overflow-hidden">
              <SidebarContent {...contentProps} />
            </div>
            <FileManagerModal open={isFileManagerOpen} onOpenChange={setIsFileManagerOpen} documents={activeDocuments} onSelectDocument={onSelect} />
          </aside>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: render as sidebar, full height
  return (
    <aside className={cn('h-screen w-full flex flex-col pt-14', SIDEBAR_GLASS_CLASSES)}>
      <SidebarToolbar {...toolbarProps} />
      <div className="flex-1 min-h-0 overflow-hidden">
        <SidebarContent {...contentProps} />
      </div>
      <FileManagerModal open={isFileManagerOpen} onOpenChange={setIsFileManagerOpen} documents={activeDocuments} onSelectDocument={onSelect} />
    </aside>
  );
};
