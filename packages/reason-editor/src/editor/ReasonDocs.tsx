/**
 * @module ReasonDocs
 * @description Root layout component for the Reason Docs editor application.
 * Assembles the resizable sidebar, document tabs, editor area, right-panel outline,
 * and all application-level dialogs into a single responsive shell.
 */
import { Sidebar } from '../layout/Sidebar';
import { EditorArea } from './EditorArea';
import { RightPanel } from './RightPanel';
import { ReasonDocsDialogs } from './ReasonDocsDialogs';
import { useReasonDocsState } from './useReasonDocsState';
import { DynamicIslandTOC } from '../search/DynamicIslandTOC';
import { Button } from '../app-ui/button';
import { useTheme } from 'next-themes';
import { useMemo, useState, type ReactNode } from 'react';
import { SplitPane, Pane } from 'react-split-pane';
import { usePersistence } from 'react-split-pane/persistence';
import { ssrSafeLocalStorage } from '../utils/storage';
import { Menu, PanelRight } from 'lucide-react';
import '../app-styles/split-pane.css';

/** A non-document tab (e.g. a chat conversation) supplied by the host app. */
export interface ReasonDocsExtraTab {
  id: string;
  title: string;
  kind: 'chat';
}

interface ReasonDocsProps {
  mainContent?: ReactNode;
  /**
   * Optional content rendered below `mainContent` (e.g. a compact chat
   * input), stacked under the main area with minimal padding. On mobile
   * widths with room to spare it shares the bottom row with the app dock
   * instead of stacking above it.
   */
  belowMainContent?: ReactNode;
  /**
   * Changing this value (e.g. bumping a counter) opens the files sidebar.
   * Lets chrome mounted outside this component — like an app dock icon —
   * request the sidebar open.
   */
  openFilesSidebarSignal?: number | string;
}

/**
 * Root application component that wires together all major UI regions.
 * Uses `useReasonDocsState` for shared state and `next-themes` for theme control.
 * Renders a resizable panel layout on desktop and a stacked layout on mobile.
 */
const Index = ({ mainContent, belowMainContent, openFilesSidebarSignal }: ReasonDocsProps) => {
  const { theme, setTheme } = useTheme();
  const state = useReasonDocsState(openFilesSidebarSignal);
  const [settingsInitialSection, setSettingsInitialSection] = useState<string | undefined>(undefined);

  // Use persistence hook for sidebar sizes
  const [sidebarSizes, setSidebarSizes] = usePersistence({
    key: 'reason-docs-sidebar',
    storage: ssrSafeLocalStorage,
  });

  /** Toggles between 'dark' and 'light' application theme. */
  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Merge document tabs with host-supplied extra tabs (e.g. open chats) into
  // a single ordered list for the "Open Tabs" panel.
  const tabItems: OpenTabItem[] = useMemo(() => {
    const fileItems: OpenTabItem[] = state.openTabs.map((id) => ({
      id,
      title: state.documents.find((d) => d.id === id)?.title || 'Untitled',
      kind: 'file' as const,
    }));
    const chatItems: OpenTabItem[] = (extraTabs ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      kind: t.kind,
    }));
    return [...fileItems, ...chatItems];
  }, [state.openTabs, state.documents, extraTabs]);

  const activeTabId = activeExtraTabId ?? state.activeDocId;

  const handleTabChange = (id: string) => {
    if (extraTabs?.some((t) => t.id === id)) {
      onExtraTabSelect?.(id);
    } else {
      state.handleTabChange(id);
      onFileTabSelect?.();
    }
  };

  const handleTabClose = (id: string) => {
    if (extraTabs?.some((t) => t.id === id)) {
      onExtraTabClose?.(id);
    } else {
      state.handleTabClose(id);
    }
  };

  // Creating a note (not a folder) opens it as the active document, so
  // switch away from whatever extra tab (e.g. a chat) was showing.
  const handleAdd = (parentId: string | null, isFolder?: boolean) => {
    state.handleAddDocument(parentId, isFolder);
    if (!isFolder) onFileTabSelect?.();
  };

  // Selecting a document (e.g. from the file tree) should also switch away
  // from an active chat/extra tab, since it opens as the active document.
  const handleSelect = (id: string) => {
    state.handleSelectDocument(id);
    onFileTabSelect?.();
  };

  const sidebarProps = {
    documents: state.documents,
    activeId: state.activeDocId,
    activeDocument: state.activeDocument,
    onSelect: handleSelect,
    onAdd: handleAdd,
    onDelete: state.handleDeleteDocument,
    onDuplicate: state.handleDuplicateDocument,
    onToggleExpand: state.handleToggleExpand,
    onMove: state.handleMoveDocument,
    onManageTags: state.handleManageTags,
    onRename: (id: string, title: string) => state.handleUpdateDocument(id, { title }),
    searchQuery: state.searchQuery,
    onSearchChange: state.setSearchQuery,
    onSearchClear: () => state.setSearchQuery(''),
    onSearchFocus: () => state.setIsSearchModalOpen(true),
    isOpen: state.isSidebarOpen,
    onOpenChange: state.setIsSidebarOpen,
    isMobile: state.isMobile,
    leftPanels: state.leftPanels,
    onLeftPanelsChange: state.setLeftPanels,
    leftSplit: state.leftSplit,
    onLeftSplitChange: state.setLeftSplit,
    rightPanels: state.rightPanels,
    onRightPanelsChange: state.setRightPanels,
    rightSplit: state.rightSplit,
    onRightSplitChange: state.setRightSplit,
    onSettingsClick: (section?: string) => { setSettingsInitialSection(section); state.setIsSettingsOpen(true); },
    onInviteClick: () => state.setIsInviteModalOpen(true),
    onRestore: state.handleRestoreDocument,
    onPermanentDelete: state.handlePermanentDelete,
    newDocumentId: state.newDocumentId,
    showDynamicIsland: state.showDynamicIsland,
    onToggleDynamicIsland: () => state.setShowDynamicIsland(!state.showDynamicIsland),
    activeFileSourceId: state.activeFileSourceId,
    onFileSourceChange: state.handleFileSourceChange,
    onNavigate: (key: string) => state.editorRef.current?.scrollToHeading(key),
    openTabs: state.openTabs,
    activeTab: activeTabId,
    onTabChange: handleTabChange,
    onTabClose: handleTabClose,
    onTabRename: (id: string, title: string) => state.handleUpdateDocument(id, { title }),
    onSplitRight: state.handleSplitRight,
    onReopenLastClosed: state.handleReopenLastClosed,
    canReopenLastClosed: state.closedTabsHistory.length > 0,
    tabItems,
    onNewChat: onExtraTabAdd,
    aiProps: {
      isAiLoading: state.isAiLoading,
      aiSuggestion: state.aiSuggestion,
      onAiApprove: state.handleAIApprove,
      onAiReject: state.handleAIReject,
      onAiRegenerate: state.handleAIRegenerate,
    },
  };

  const editorProps = {
    activeDocument: state.activeDocument,
    documents: state.documents,
    splitViewDocId: state.splitViewDocId,
    activeDocId: state.activeDocId,
    isMobile: state.isMobile,
    editorRef: state.editorRef,
    onUpdateDocument: state.handleUpdateDocument,
    onHeadingsChange: state.setHeadings,
    onCloseSplitView: () => state.setSplitViewDocId(null),
    aiSuggestion: state.aiSuggestion,
    isAiLoading: state.isAiLoading,
    onAiRewrite: state.handleAIRewrite,
    onAiApprove: state.handleAIApprove,
    onAiReject: state.handleAIReject,
    onAiRegenerate: state.handleAIRegenerate,
    onInviteClick: () => state.setIsInviteModalOpen(true),
    onShareClick: () => state.setIsInviteModalOpen(true),
  };


  const rightPanel = state.rightPanels.length > 0 && (
    <RightPanel
      panels={state.rightPanels}
      split={state.rightSplit}
      documents={state.documents}
      activeId={state.activeDocId}
      activeDocument={state.activeDocument}
      onSelect={handleSelect}
      onAdd={handleAdd}
      onDelete={state.handleDeleteDocument}
      onDuplicate={state.handleDuplicateDocument}
      onMove={state.handleMoveDocument}
      onManageTags={state.handleManageTags}
      onRename={(id: string, title: string) => state.handleUpdateDocument(id, { title })}
      headings={state.headings}
      onNavigate={(key) => state.editorRef.current?.scrollToHeading(key)}
      openTabs={state.openTabs}
      activeTab={activeTabId}
      onTabChange={handleTabChange}
      onTabClose={handleTabClose}
      onTabRename={(id: string, title: string) => state.handleUpdateDocument(id, { title })}
      onSplitRight={state.handleSplitRight}
      onReopenLastClosed={state.handleReopenLastClosed}
      canReopenLastClosed={state.closedTabsHistory.length > 0}
      tabItems={tabItems}
      onNewChat={onExtraTabAdd}
      aiProps={{
        isAiLoading: state.isAiLoading,
        aiSuggestion: state.aiSuggestion,
        onAiApprove: state.handleAIApprove,
        onAiReject: state.handleAIReject,
        onAiRegenerate: state.handleAIRegenerate,
      }}
      onClose={() => state.setRightPanels([])}
      isMobile={state.isMobile}
      isOpen={state.isRightSidebarOpen}
      onOpenChange={state.setIsRightSidebarOpen}
    />
  );

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {state.isMobile ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Hamburger bar: opens the left (files) and right sidebars as drawers. */}
          <div className="flex items-center justify-between h-10 px-1 border-b border-sidebar-border/60 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0"
              onClick={() => state.setIsSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>
            {state.rightPanels.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0"
                onClick={() => state.setIsRightSidebarOpen(true)}
                aria-label="Open right panel"
              >
                <PanelRight className="h-5 w-5" />
              </Button>
            )}
          </div>
          <div className="flex-1 flex overflow-hidden">
            <Sidebar {...sidebarProps} headings={state.headings} />
            <main className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                {mainContent ?? <EditorArea {...editorProps} />}
              </div>
              {belowMainContent && (
                <div className="shrink-0 px-2 pt-1 pb-[60px] sm:pb-2 sm:pr-56">
                  {belowMainContent}
                </div>
              )}
            </main>
            {rightPanel}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <SplitPane direction="horizontal" onResize={setSidebarSizes}>
            {/* Sidebar */}
            <Pane size={sidebarSizes?.[0] || '250px'} minSize="0px" maxSize="600px">
              <div className="overflow-y-auto overflow-x-hidden bg-background">
                <Sidebar {...sidebarProps} headings={state.headings} />
              </div>
            </Pane>

            {/* Main area */}
            <Pane>
              <div className="h-screen flex flex-col bg-background">
                <div className="flex-1 flex min-h-0">
                  <div className="flex-1 min-h-0 overflow-auto">
                    {mainContent ?? <EditorArea {...editorProps} />}
                  </div>
                  {rightPanel}
                </div>
                {belowMainContent && (
                  <div className="shrink-0 px-2 pb-2">{belowMainContent}</div>
                )}
              </div>
            </Pane>
          </SplitPane>
        </div>
      )}

      {state.headings.length > 0 && state.rightPanels.length === 0 && state.showDynamicIsland && (
        <DynamicIslandTOC
          headings={state.headings}
          onNavigate={(key) => state.editorRef.current?.scrollToHeading(key)}
          editorRef={state.editorRef}
        />
      )}

      <ReasonDocsDialogs
        isSearchModalOpen={state.isSearchModalOpen}
        setIsSearchModalOpen={state.setIsSearchModalOpen}
        isSettingsOpen={state.isSettingsOpen}
        setIsSettingsOpen={state.setIsSettingsOpen}
        settingsInitialSection={settingsInitialSection}
        isTeamsOpen={state.isTeamsOpen}
        setIsTeamsOpen={state.setIsTeamsOpen}
        isInviteModalOpen={state.isInviteModalOpen}
        setIsInviteModalOpen={state.setIsInviteModalOpen}
        isTagDialogOpen={state.isTagDialogOpen}
        setIsTagDialogOpen={state.setIsTagDialogOpen}
        documents={state.documents}
        activeDocument={state.activeDocument}
        tagManagementDocId={state.tagManagementDocId}
        defaultSidebarView={state.defaultSidebarView}
        setDefaultSidebarView={state.setDefaultSidebarView}
        enableDatabaseSync={state.enableDatabaseSync}
        setEnableDatabaseSync={state.setEnableDatabaseSync}
        setDocuments={state.setDocuments}
        onSelectDocument={handleSelect}
        onToggleTheme={handleToggleTheme}
        currentTheme={theme}
        onUpdateTags={state.handleUpdateTags}
      />
    </div>
  );
};

export default Index;
