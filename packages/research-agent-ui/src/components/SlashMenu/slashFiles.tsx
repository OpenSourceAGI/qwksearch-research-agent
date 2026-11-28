/**
 * @fileoverview The file rows of the slash menu.
 *
 * Two sources, both already reachable from the chat:
 *
 * - **Library documents** (`listDocuments` from the API client — the REASON
 *   editor's saved documents). Choosing one attaches it exactly like a picked
 *   upload: its content becomes a `File`, goes through the composer's normal
 *   upload path, and shows up as an attachment chip.
 * - **Files already attached to this chat** (`useChat().files`). Choosing one
 *   inserts an `@file-name` mention into the message, since it is already in
 *   the conversation's context.
 */
import { File as FileIcon, FileText } from 'lucide-react';
import type { ChatFile } from '../../types/chat';
import type { SlashItem } from './types';

/** The slice of an API document the menu reads. */
export interface LibraryDocument {
  id?: number;
  title?: string;
  name?: string;
  content?: string;
  isFolder?: boolean;
}

/** Characters of content shown (and searched) as a document's description. */
const PREVIEW_LENGTH = 140;

const ICON = 'h-4 w-4';

/** One-line plain-text preview of a document body. */
export function previewContent(content: string | undefined): string {
  if (!content) return '';
  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*_`>\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, PREVIEW_LENGTH);
}

/** Display name of a library document. */
export function documentName(doc: LibraryDocument): string {
  return (doc.title || doc.name || '').trim() || 'Untitled';
}

/**
 * Wraps a library document in a `File` the composer's upload path accepts
 * (`.html` for markup, `.md` otherwise — both are server-extracted types).
 */
export function libraryDocumentToFile(doc: LibraryDocument): File {
  const content = doc.content ?? '';
  const isHtml = /^\s*</.test(content);
  const base = documentName(doc).replace(/[\\/:*?"<>|]+/g, '-');
  const ext = isHtml ? 'html' : 'md';
  const name = base.toLowerCase().endsWith(`.${ext}`) ? base : `${base}.${ext}`;
  return new File([content], name, { type: isHtml ? 'text/html' : 'text/markdown' });
}

export interface SlashFileSources {
  documents: readonly LibraryDocument[];
  attachedFiles: readonly ChatFile[];
  /** Attach a library document as a composer attachment. */
  attachDocument: (doc: LibraryDocument) => void;
}

/** Builds the file rows: files in this chat first, then the library. */
export function buildSlashFileItems(sources: SlashFileSources): SlashItem[] {
  const attached: SlashItem[] = sources.attachedFiles.map((file) => ({
    id: `file:attached:${file.fileId}`,
    kind: 'file',
    name: file.fileName,
    description: 'Attached to this chat',
    keywords: file.fileExtension,
    hint: file.fileExtension ? `.${file.fileExtension.replace(/^\./, '')}` : undefined,
    icon: <FileIcon className={ICON} />,
    insertText: `@${file.fileName} `,
  }));

  const library: SlashItem[] = sources.documents
    .filter((doc) => !doc.isFolder && doc.id !== undefined)
    .map((doc) => ({
      id: `file:doc:${doc.id}`,
      kind: 'file' as const,
      name: documentName(doc),
      description: previewContent(doc.content) || 'Library document',
      keywords: 'library document',
      hint: 'Library',
      icon: <FileText className={ICON} />,
      run: () => sources.attachDocument(doc),
    }));

  return [...attached, ...library];
}
