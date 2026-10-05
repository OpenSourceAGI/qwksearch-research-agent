'use client';

/**
 * @fileoverview The full QwkSearch app: the same provider stack and chrome as
 * the chat-only build, wrapped around the REASON workspace — documents,
 * editor, and file sidebar alongside the conversation.
 */
import {
  QwkSearchProviders,
  type QwkSearchProvidersProps,
} from '../app/QwkSearchProviders';
import {
  ResearchWorkspaceView,
  type ResearchWorkspaceViewProps,
} from './ResearchWorkspaceView';

export type QwkSearchWorkspaceAppProps = Omit<
  QwkSearchProvidersProps,
  'children' | 'docsEnabled'
> &
  ResearchWorkspaceViewProps;

/**
 * Pass `showDock={false}` when the host draws its own app dock (this app's
 * dock — Research, Docs, Settings — is then not rendered at all), and
 * `SidebarComponent` / `openSidebarEvent` to host chrome in, and drive, the
 * workspace's own sidebar.
 */
export function QwkSearchWorkspaceApp({
  SidebarComponent,
  SidebarContentComponent,
  openSidebarEvent,
  ...providerProps
}: QwkSearchWorkspaceAppProps) {
  return (
    <QwkSearchProviders {...providerProps} docsEnabled>
      <ResearchWorkspaceView
        SidebarComponent={SidebarComponent}
        SidebarContentComponent={SidebarContentComponent}
        openSidebarEvent={openSidebarEvent}
      />
    </QwkSearchProviders>
  );
}

export default QwkSearchWorkspaceApp;
