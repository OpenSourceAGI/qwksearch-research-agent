/**
 * @fileoverview Renders the files a user attached to a message inline in the conversation flow.
 *
 * Each attachment is shown as a compact chip with a file-type icon, name and extension, plus a trash button that asks for confirmation before permanently deleting the upload.
 */
'use client';

import React, { useState } from 'react';
import { FileText, Image as ImageIcon, Link2, Loader2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../../ui/dialog';
import { useChat } from '../../../hooks/useChat';
import type { MessageFile } from '../ChatWindow';

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'];

/** Picks an icon for a file based on its extension. */
const iconForExtension = (ext: string): React.ReactNode => {
  const lower = (ext || '').toLowerCase();
  if (IMAGE_EXTS.includes(lower)) return <ImageIcon size={15} />;
  if (lower === 'url') return <Link2 size={15} />;
  return <FileText size={15} />;
};

/** A single attachment chip with its own delete-confirmation dialog. */
const AttachmentChip = ({ file }: { file: MessageFile }) => {
  const { deleteAttachedFile } = useChat();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAttachedFile(file.fileId);
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="group inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-secondary/40 py-1.5 pl-2.5 pr-1.5 text-sm">
        <span className="text-muted-foreground">{iconForExtension(file.fileExtension)}</span>
        <span className="min-w-0 truncate font-medium text-foreground" title={file.fileName}>
          {file.fileName}
        </span>
        {file.fileExtension && file.fileExtension !== 'url' && (
          <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
            {file.fileExtension}
          </span>
        )}
        <button
          type="button"
          aria-label={`Delete ${file.fileName}`}
          onClick={() => setConfirmOpen(true)}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!deleting) setConfirmOpen(open);
        }}
      >
        <DialogContent className="w-full max-w-md rounded-2xl">
          <DialogTitle className="text-lg font-medium leading-6">
            Delete file
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">{file.fileName}</span>? This
            removes it from the conversation and permanently deletes the upload.
          </DialogDescription>
          <div className="mt-6 flex flex-row items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => !deleting && setConfirmOpen(false)}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 text-sm text-red-500 transition-colors hover:text-red-600 disabled:opacity-60"
            >
              {deleting && <Loader2 size={14} className="animate-spin" />}
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/**
 * Displays the list of files attached to a user message. Renders nothing when
 * there are no attachments.
 */
const MessageAttachments = ({ files }: { files?: MessageFile[] }) => {
  if (!files || files.length === 0) return null;

  return (
    <div className="ml-10 mt-2 flex flex-wrap gap-2">
      {files.map((file) => (
        <AttachmentChip key={file.fileId} file={file} />
      ))}
    </div>
  );
};

export default MessageAttachments;
