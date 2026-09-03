/**
 * @module ReasonDocsDialogs
 * @description Aggregates all application-level dialog/modal components (search,
 * settings, team management, invite, tag management) into a single portal container.
 */
import type { Document } from 'react-reason-editor-sidebar';
import { SearchModal } from '../search/SearchModal';
import { Settings } from '../features/settings/Settings';
import { TeamManagement } from '../features/team/TeamManagement';
import { InviteModal } from '../dialogs/InviteModal';
import { TagManagementDialog } from '../features/tags/TagManagementDialog';

/** Props for the {@link ReasonDocsDialogs} container. */
interface ReasonDocsDialogsProps {
  /** Controls visibility of the command-palette search modal. */
  isSearchModalOpen: boolean;
  /** Setter for `isSearchModalOpen`. */
  setIsSearchModalOpen: (open: boolean) => void;
  /** Controls visibility of the settings dialog. */
  isSettingsOpen: boolean;
  /** Setter for `isSettingsOpen`. */
  setIsSettingsOpen: (open: boolean) => void;
  /** Section to open when the settings dialog is shown. */
  settingsInitialSection?: string;
  /** Controls visibility of the team-management dialog. */
  isTeamsOpen: boolean;
  /** Setter for `isTeamsOpen`. */
  setIsTeamsOpen: (open: boolean) => void;
  /** Controls visibility of the invite modal. */
  isInviteModalOpen: boolean;
  /** Setter for `isInviteModalOpen`. */
  setIsInviteModalOpen: (open: boolean) => void;
  /** Controls visibility of the tag-management dialog. */
  isTagDialogOpen: boolean;
  /** Setter for `isTagDialogOpen`. */
  setIsTagDialogOpen: (open: boolean) => void;
  /** Full list of documents for search and tag resolution. */
  documents: Document[];
  /** Currently active document, used by the invite modal for context. */
  activeDocument: Document | undefined;
  /** ID of the document whose tags are currently being managed; null if none. */
  tagManagementDocId: string | null;
  defaultSidebarView: 'split' | 'tree' | 'outline' | 'last-used';
  setDefaultSidebarView: (view: 'split' | 'tree' | 'outline' | 'last-used') => void;
  enableDatabaseSync: boolean;
  setEnableDatabaseSync: (enabled: boolean) => void;
  setDocuments: (docs: Document[] | ((prev: Document[]) => Document[])) => void;
  onSelectDocument: (id: string) => void;
  onToggleTheme: () => void;
  currentTheme: string | undefined;
  onUpdateTags: (tags: string[]) => void;
}

/**
 * Renders all application-level dialogs as a React fragment so they can be placed
 * at the root level of the component tree without affecting layout flow.
 */
export function ReasonDocsDialogs({
  isSearchModalOpen,
  setIsSearchModalOpen,
  isSettingsOpen,
  setIsSettingsOpen,
  settingsInitialSection,
  isTeamsOpen,
  setIsTeamsOpen,
  isInviteModalOpen,
  setIsInviteModalOpen,
  isTagDialogOpen,
  setIsTagDialogOpen,
  documents,
  activeDocument,
  tagManagementDocId,
  defaultSidebarView,
  setDefaultSidebarView,
  enableDatabaseSync,
  setEnableDatabaseSync,
  setDocuments,
  onSelectDocument,
  onToggleTheme,
  currentTheme,
  onUpdateTags,
}: ReasonDocsDialogsProps) {
  return (
    <>
      <SearchModal
        open={isSearchModalOpen}
        onOpenChange={setIsSearchModalOpen}
        documents={documents}
        onSelectDocument={onSelectDocument}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTeams={() => setIsTeamsOpen(true)}
        onToggleTheme={onToggleTheme}
        currentTheme={currentTheme}
      />

      <Settings
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        initialSection={settingsInitialSection}
        defaultSidebarView={defaultSidebarView}
        onDefaultSidebarViewChange={setDefaultSidebarView}
        enableDatabaseSync={enableDatabaseSync}
        onEnableDatabaseSyncChange={setEnableDatabaseSync}
      />

      <TeamManagement open={isTeamsOpen} onOpenChange={setIsTeamsOpen} />

      <InviteModal
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
        documentTitle={activeDocument?.title || 'Untitled'}
        documentId={activeDocument?.id || ''}
        sharingInfo={activeDocument?.sharing}
        onUpdateSharing={(sharing) => {
          if (activeDocument) {
            setDocuments((docs: Document[]) =>
              docs.map((doc: Document) =>
                doc.id === activeDocument.id
                  ? { ...doc, sharing }
                  : doc
              )
            );
          }
        }}
      />

      <TagManagementDialog
        open={isTagDialogOpen}
        onOpenChange={setIsTagDialogOpen}
        currentTags={tagManagementDocId ? (documents.find(d => d.id === tagManagementDocId)?.tags || []) : []}
        onUpdateTags={onUpdateTags}
      />
    </>
  );
}
