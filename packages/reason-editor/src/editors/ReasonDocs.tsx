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
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { SplitPane, Pane } from 'react-split-pane';
import { usePersistence } from 'react-split-pane/persistence';
import '../styles/split-pane.css';


/**
 * Root application component that wires together all major UI regions.
 * Uses `useReasonDocsState` for shared state and `next-themes` for theme control.
 * Renders a resizable panel layout on desktop and a stacked layout on mobile.
 */
const Index = () => {
  const { theme, setTheme } = useTheme();
  const state = useReasonDocsState();
  const [settingsInitialSection, setSettingsInitialSection] = useState<string | undefined>(undefined);

  // Use persistence hook for sidebar sizes
  const [sidebarSizes, setSidebarSizes] = usePersistence({ key: 'reason-docs-sidebar' });
  const [rightPanelSizes, setRightPanelSizes] = usePersistence({ key: 'reason-docs-right-panel' });

  /** Toggles between 'dark' and 'light' application theme. */
  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const sidebarProps = {
    documents: state.documents,
    activeId: state.activeDocId,
    activeDocument: state.activeDocument,
    onSelect: state.handleSelectDocument,
    onAdd: state.handleAddDocument,
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
    viewMode: state.viewMode,
    onViewModeChange: state.setViewMode,
    onSettingsClick: (section?: string) => { setSettingsInitialSection(section); state.setIsSettingsOpen(true); },
    onInviteClick: () => state.setIsInviteModalOpen(true),
    onRestore: state.handleRestoreDocument,
    onPermanentDelete: state.handlePermanentDelete,
    newDocumentId: state.newDocumentId,
    showRightOutline: state.showRightOutline,
    onToggleRightOutline: () => state.setShowRightOutline(!state.showRightOutline),
    activeFileSourceId: state.activeFileSourceId,
    onFileSourceChange: state.handleFileSourceChange,
    openTabs: state.openTabs,
    activeTab: state.activeDocId,
    onTabChange: state.handleTabChange,
    onTabClose: state.handleTabClose,
    onTabRename: (id: string, title: string) => state.handleUpdateDocument(id, { title }),
    onSplitRight: state.handleSplitRight,
    onReopenLastClosed: state.handleReopenLastClosed,
    canReopenLastClosed: state.closedTabsHistory.length > 0,
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


  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {state.isMobile ? (
        <div className="flex-1 flex overflow-hidden">
          <Sidebar {...sidebarProps} headings={state.headings} />
          <main className="flex-1 overflow-hidden flex flex-col">
            <EditorArea {...editorProps} />
          </main>
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

            {/* Main area with optional right panel */}
            <Pane>
              {state.showRightOutline ? (
                <SplitPane direction="horizontal" onResize={setRightPanelSizes}>
                  {/* Main editor area */}
                  <Pane>
                    <div className="h-full flex flex-col bg-background">
                      <div className="flex-1 min-h-0">
                        <EditorArea {...editorProps} />
                      </div>
                    </div>
                  </Pane>

                  {/* Right panel */}
                  <Pane size={rightPanelSizes?.[1] || '300px'} minSize="250px" maxSize="500px">
                    <div className="h-full overflow-y-auto overflow-x-hidden border-l border-border bg-background">
                      <RightPanel
                        showAiPanel={state.showAiPanel}
                        setShowAiPanel={state.setShowAiPanel}
                        isAiLoading={state.isAiLoading}
                        aiSuggestion={state.aiSuggestion}
                        onAiApprove={state.handleAIApprove}
                        onAiReject={state.handleAIReject}
                        onAiRegenerate={state.handleAIRegenerate}
                        headings={state.headings}
                        searchQuery={state.searchQuery}
                        onNavigate={(key) => state.editorRef.current?.scrollToHeading(key)}
                        documentContent={state.activeDocument?.content || ''}
                      />
                    </div>
                  </Pane>
                </SplitPane>
              ) : (
                <div className="h-screen flex flex-col bg-background">
                  <div className="flex-1 min-h-0 overflow-auto">
                    <EditorArea {...editorProps} />
                  </div>
                </div>
              )}
            </Pane>
          </SplitPane>
        </div>
      )}

      {state.headings.length > 0 && !state.showRightOutline && (
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
        onSelectDocument={state.handleSelectDocument}
        onToggleTheme={handleToggleTheme}
        currentTheme={theme}
        onUpdateTags={state.handleUpdateTags}
      />
    </div>
  );
};

export default Index;
