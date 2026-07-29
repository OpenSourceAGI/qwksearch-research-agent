/**
 * @fileoverview Confirmation dialogs for deleting a single chat and clearing all chat history, built on a shared reusable ConfirmDialog component.
 */
'use client';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../ui/dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  loadingLabel: string;
  loading: boolean;
  onConfirm: () => void;
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  loadingLabel,
  loading,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !loading) onOpenChange(false);
      }}
    >
      <DialogContent className="w-full max-w-md transform rounded-2xl bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 p-6 text-left align-middle shadow-xl">
        <DialogTitle className="text-lg font-medium leading-6 dark:text-white">
          {title}
        </DialogTitle>
        <DialogDescription className="text-sm dark:text-white/70 text-black/70 mt-2">
          {description}
        </DialogDescription>
        <div className="flex flex-row items-end justify-end space-x-4 mt-6">
          <button
            onClick={() => {
              if (!loading) onOpenChange(false);
            }}
            className="text-black/50 dark:text-white/50 text-sm hover:text-black/70 hover:dark:text-white/70 transition duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="text-red-400 text-sm hover:text-red-500 transition duration-200 disabled:opacity-50"
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface HistoryDialogsProps {
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  chatToDelete: string | null;
  setChatToDelete: (id: string | null) => void;
  deleting: boolean;
  onConfirmDelete: () => void;
  clearAllDialogOpen: boolean;
  setClearAllDialogOpen: (open: boolean) => void;
  clearingAll: boolean;
  onConfirmClearAll: () => void;
}

export function HistoryDialogs({
  deleteDialogOpen,
  setDeleteDialogOpen,
  chatToDelete,
  setChatToDelete,
  deleting,
  onConfirmDelete,
  clearAllDialogOpen,
  setClearAllDialogOpen,
  clearingAll,
  onConfirmClearAll,
}: HistoryDialogsProps) {
  return (
    <>
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setChatToDelete(null);
        }}
        title="Delete Confirmation"
        description="Are you sure you want to delete this chat?"
        confirmLabel="Delete"
        loadingLabel="Deleting..."
        loading={deleting}
        onConfirm={onConfirmDelete}
      />
      <ConfirmDialog
        open={clearAllDialogOpen}
        onOpenChange={setClearAllDialogOpen}
        title="Clear All History"
        description="Are you sure you want to delete all your chat history? This action cannot be undone."
        confirmLabel="Clear All"
        loadingLabel="Clearing..."
        loading={clearingAll}
        onConfirm={onConfirmClearAll}
      />
    </>
  );
}
