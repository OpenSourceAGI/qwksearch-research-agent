/**
 * @module type-definitions/document
 * @description Core Document and DocumentExtended TypeScript interfaces used
 * throughout the organizer (tree, editor, outline, search, tags).
 */
// Extended document types with metadata and research quotes

export interface ResearchQuote {
  /** Unique quote identifier. */
  id: string;
  /** Exact quoted text captured from a source. */
  text: string;
  /** Optional publication or source title. */
  source?: string;
  /** Optional author name for citation. */
  author?: string;
  /** Optional URL where the quote originated. */
  url?: string;
  /** Optional page reference within the source document. */
  pageNumber?: string;
  /** Optional labels used to categorize the quote. */
  tags?: string[];
  /** ISO timestamp when the quote was created. */
  createdAt: string;
  /** ID of the document that stores this quote. */
  documentId: string;
}

export interface DocumentMetadata {
  /** Optional document tags for organization/filtering. */
  tags?: string[];
  /** Optional category name for grouping. */
  category?: string;
  /** Optional workflow status of the document. */
  status?: 'draft' | 'in-progress' | 'review' | 'final';
  /** Optional due date (typically ISO date string). */
  dueDate?: string;
  /** Optional importance level for prioritization. */
  priority?: 'low' | 'medium' | 'high';
  /** Optional free-form metadata keyed by field name. */
  customFields?: Record<string, any>;
}

export interface SharedWithEntry {
  /** Recipient email address. */
  email: string;
  /** Access role granted to the recipient. */
  role: 'viewer' | 'editor' | 'commentor';
  /** ISO timestamp when access was granted. */
  sharedAt: string;
}

export interface SharingInfo {
  /** Controls whether the document is publicly accessible. */
  isPublic: boolean;
  /** Optional explicit user-level sharing entries. */
  sharedWith?: SharedWithEntry[];
  /** Optional generated public share link. */
  shareLink?: string;
  /** Optional Google Docs file ID for linked document. */
  googleDocId?: string;
}

export interface DocumentExtended {
  /** Unique document identifier. */
  id: string;
  /** Document title displayed in navigation and tabs. */
  title: string;
  /** Main document body content. */
  content: string;
  /** Parent document ID; null when document is top-level. */
  parentId: string | null;
  /** Optional child documents in tree form. */
  children?: DocumentExtended[];
  /** Optional UI state indicating expanded tree node. */
  isExpanded?: boolean;
  /** Optional ISO creation timestamp. */
  createdAt?: string;
  /** Optional ISO last-updated timestamp. */
  updatedAt?: string;
  /** Optional structured document metadata. */
  metadata?: DocumentMetadata;
  /** Optional sharing and access configuration. */
  sharing?: SharingInfo;
  /** Optional research quotes attached to the document. */
  quotes?: ResearchQuote[];
}
