/**
 * Example of how to use the InviteDropdown component in a toolbar
 *
 * This shows how to integrate the share/invite functionality as a dropdown
 * instead of using the modal dialog.
 */

import { InviteDropdown } from './InviteDropdown';
import { SharingInfo } from '../types/document';
import { Team } from '../types/team';

interface ToolbarWithInviteProps {
  documentTitle: string;
  documentId: string;
  sharingInfo?: SharingInfo;
  teams?: Team[];
  onUpdateSharing?: (sharing: SharingInfo) => void;
}

export const ToolbarWithInvite = ({
  documentTitle,
  documentId,
  sharingInfo,
  teams,
  onUpdateSharing,
}: ToolbarWithInviteProps) => {
  return (
    <div className="flex items-center gap-2 p-2 border-b">
      {/* Other toolbar items would go here */}
      <div className="flex-1" />

      {/* Invite Dropdown - positioned at the end of the toolbar */}
      <InviteDropdown
        documentTitle={documentTitle}
        documentId={documentId}
        sharingInfo={sharingInfo}
        teams={teams}
        onUpdateSharing={onUpdateSharing}
      />
    </div>
  );
};

/**
 * Usage in the Lexical Toolbar Plugin:
 *
 * Add to the toolbar's right side actions:
 *
 * <InviteDropdown
 *   documentTitle="My Document"
 *   documentId="doc-123"
 *   sharingInfo={sharingInfo}
 *   teams={teams}
 *   onUpdateSharing={handleUpdateSharing}
 * />
 *
 * The dropdown will appear as a UserPlus icon button that opens a compact
 * dropdown menu containing all the sharing controls.
 */
