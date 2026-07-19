/**
 * @module TagManagementDialog
 * @description Modal dialog for managing the complete tag list of a document.
 * Edits are staged locally and only committed when the user clicks "Save Tags".
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, Plus } from 'lucide-react';

/** Props for the {@link TagManagementDialog} component. */
interface TagManagementDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Callback to open or close the dialog. */
  onOpenChange: (open: boolean) => void;
  /** The document's current tag list, used to seed local state. */
  currentTags: string[];
  /** Called with the final tag array when the user saves. */
  onUpdateTags: (tags: string[]) => void;
}

/**
 * Dialog that presents the full tag list for a document with add and remove
 * capabilities. Changes are staged in local state until the user clicks
 * "Save Tags".
 */
export const TagManagementDialog = ({
  open,
  onOpenChange,
  currentTags,
  onUpdateTags,
}: TagManagementDialogProps) => {
  const [newTag, setNewTag] = useState('');
  const [tags, setTags] = useState<string[]>(currentTags);

  /**
   * Adds `newTag` to the local tag list. Does nothing if the tag is empty
   * or already present.
   */
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      setNewTag('');
    }
  };

  /**
   * Removes a tag from the local list by value.
   *
   * @param tagToRemove - The exact tag string to remove.
   */
  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(updatedTags);
  };

  /** Commits the staged tag list via `onUpdateTags` and closes the dialog. */
  const handleSave = () => {
    onUpdateTags(tags);
    onOpenChange(false);
  };

  /** Submits the tag input on `Enter` key. */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter tag name..."
              className="flex-1"
            />
            <Button onClick={handleAddTag} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[60px] p-3 border border-border rounded-md bg-muted/20">
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags added yet</p>
            ) : (
              tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1 pl-2 pr-1"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:bg-background/80 rounded-sm p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Tags
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
