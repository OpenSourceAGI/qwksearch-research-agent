'use client';

import './reason-docs.css';

import { useThemeMode } from 'antd-style';
import { memo, useEffect } from 'react';
import { localeActions } from 'react-reason-editor/locale-bundle';
import { ReasonDocs } from 'react-reason-editor/reason-docs';
import { themeActions } from 'react-reason-editor/theme';
import { Sidebar, SidebarContent } from 'react-reason-editor-sidebar';

export interface ReasonDocsViewProps {
  /** Document to open once on load, e.g. from the `/docs/:docId` URL. */
  initialDocId?: string | null;
  /** Mirrors the active document back to the host (the URL). */
  onActiveDocumentChange?: (docId: string | null) => void;
}

/** Body classes that scope the REASON tokens and dark variant in `reason-docs.css`. */
const BODY_CLASS = 'qwk-reason';
const BODY_DARK_CLASS = 'qwk-reason-dark';

/**
 * QwkSearch's REASON editor with its files/favorites/recent sidebar, mounted
 * the way `apps/qwksearch-web` mounts it but without the research chat: the
 * chat in Qwk in Lobe stays LobeHub's own engine.
 *
 * Documents are local-first (browser storage), like on qwksearch.com. The
 * editor's "database sync" setting syncs them to this Worker's
 * `/api/doc/documents`, which keeps the qwksearch-web contract.
 *
 * Heavy (the Plate/Tiptap editor tree and its Tailwind stylesheet), so it is
 * only ever reached through the lazy import in `./index.tsx`.
 */
const ReasonDocsView = memo<ReasonDocsViewProps>(({ initialDocId, onActiveDocumentChange }) => {
  const { isDarkMode } = useThemeMode();

  useEffect(() => {
    localeActions.setLang('en');
    themeActions.setColor('default');
  }, []);

  useEffect(() => {
    themeActions.setTheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // The tokens go on <body>, not the root div, so the dialogs and menus the
  // editor portals into <body> pick them up too. Removed on unmount, so the
  // rest of LobeHub never sees them.
  useEffect(() => {
    const { classList } = document.body;
    classList.add(BODY_CLASS);
    classList.toggle(BODY_DARK_CLASS, isDarkMode);
    return () => {
      classList.remove(BODY_CLASS, BODY_DARK_CLASS);
    };
  }, [isDarkMode]);

  return (
    <div
      className={isDarkMode ? 'qwk-reason-root dark' : 'qwk-reason-root'}
      style={{ height: '100%', minHeight: 0, overflow: 'hidden', position: 'relative' }}
    >
      <ReasonDocs
        SidebarComponent={Sidebar}
        SidebarContentComponent={SidebarContent}
        initialDocId={initialDocId}
        settingsHref={'/settings'}
        onActiveDocumentChange={onActiveDocumentChange}
      />
    </div>
  );
});

ReasonDocsView.displayName = 'QwkSearchReasonDocsView';

export default ReasonDocsView;
