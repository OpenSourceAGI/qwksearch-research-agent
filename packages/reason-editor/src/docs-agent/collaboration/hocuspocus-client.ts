/**
 * Collaboration wiring shared by both editor engines.
 *
 * Rooms are namespaced by engine on purpose. Tiptap stores a ProseMirror
 * document in the Yjs doc and Plate stores a Slate document; the two states are
 * not interchangeable, so pointing both engines at one room would corrupt it.
 * They stay separate until there is an explicit conversion/export pipeline.
 */

import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

import type { EditorEngine } from '../shared/editor-types';

export const ROOM_PREFIX = 'reason-editor';

/** `reason-editor:tiptap:abc123` / `reason-editor:plate:abc123`. */
export function collaborationRoom(engine: EditorEngine, documentId: string): string {
  if (!documentId) throw new Error('collaborationRoom: documentId is required');

  return `${ROOM_PREFIX}:${engine}:${documentId}`;
}

/**
 * Parses a room name back into its parts. The collaboration server uses the same
 * rules in `onAuthenticate` to reject malformed rooms before syncing anything.
 */
export function parseCollaborationRoom(
  room: string,
): { engine: EditorEngine; documentId: string } | null {
  const [prefix, engine, ...rest] = room.split(':');
  const documentId = rest.join(':');

  if (prefix !== ROOM_PREFIX) return null;
  if (engine !== 'tiptap' && engine !== 'plate') return null;
  if (!documentId) return null;

  return { engine, documentId };
}

export function hocuspocusUrl(): string {
  const url =
    (typeof process !== 'undefined' &&
      (process.env.NEXT_PUBLIC_HOCUSPOCUS_URL ??
        process.env.VITE_HOCUSPOCUS_URL)) ||
    'ws://127.0.0.1:1234';

  return url;
}

export interface CollaborationOptions {
  engine: EditorEngine;
  documentId: string;
  /** Session token. The server rejects empty tokens and unauthorised documents. */
  token: string;
  url?: string;
  onSynced?: (synced: boolean) => void;
}

export interface CollaborationSession {
  room: string;
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  destroy(): void;
}

/**
 * Opens a Hocuspocus connection for one engine/document pair. Tiptap uses this
 * directly; Plate goes through `@platejs/yjs`'s provider config, which builds
 * the same connection from `plateYjsProviders()` below.
 */
export function createCollaborationSession({
  engine,
  documentId,
  token,
  url = hocuspocusUrl(),
  onSynced,
}: CollaborationOptions): CollaborationSession {
  const room = collaborationRoom(engine, documentId);
  const ydoc = new Y.Doc();

  const provider = new HocuspocusProvider({
    document: ydoc,
    name: room,
    token,
    url,
    onSynced: () => onSynced?.(true),
  });

  return {
    room,
    ydoc,
    provider,
    destroy() {
      provider.destroy();
      ydoc.destroy();
    },
  };
}

/**
 * Provider config for `@platejs/yjs`. Kept next to the Tiptap wiring so both
 * engines pick up room-name and URL changes from one place.
 */
export function plateYjsProviders({
  documentId,
  token,
  url = hocuspocusUrl(),
}: Omit<CollaborationOptions, 'engine' | 'onSynced'>) {
  const room = collaborationRoom('plate', documentId);

  return [
    {
      type: 'hocuspocus' as const,
      options: { name: room, token, url },
    },
    {
      type: 'indexeddb' as const,
      options: { docName: room },
    },
  ];
}

const CURSOR_COLORS = [
  '#e11d48',
  '#0891b2',
  '#7c3aed',
  '#ea580c',
  '#16a34a',
  '#2563eb',
  '#db2777',
  '#ca8a04',
];

/** Stable per-user cursor colour so a reload keeps the same presence colour. */
export function cursorColorFor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }

  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}
