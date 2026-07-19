/**
 * @module TagBar
 * @description Inline tag strip rendered below the document title. Displays
 * existing tags as dismissible badges and provides an inline text input to
 * add new tags without opening a separate dialog.
 */
import { X, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { useState } from 'react';

/** Props for the {@link TagBar} component. */
interface TagBarProps {
  /** Current list of tag strings to display. */
  tags: string[];
  /** Called with the new tag string when the user confirms the input. */
  onAddTag: (tag: string) => void;
  /** Called with the tag string to remove when the user clicks ✕. */
  onRemoveTag: (tag: string) => void;
}

/**
 * Compact tag strip rendered in the editor toolbar area. Tags are shown as
 * closable badges; clicking "Add Tag" reveals an auto-focused input whose
 * value is committed on `Enter` or `blur`, and cancelled on `Escape`.
 */
export const TagBar = ({ tags, onAddTag, onRemoveTag }: TagBarProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState('');

  /**
   * Validates and commits the current `newTag` input.
   * Ignores empty values and duplicate tags.
   */
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onAddTag(newTag.trim());
      setNewTag('');
      setIsAdding(false);
    }
  };

  /**
   * Keyboard shortcuts for the tag input.
   * - `Enter` triggers {@link handleAddTag}.
   * - `Escape` closes the input and discards the value.
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      setNewTag('');
      setIsAdding(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card flex-wrap">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="gap-1 pl-2 pr-1 text-xs"
        >
          {tag}
          <button
            onClick={() => onRemoveTag(tag)}
            className="ml-1 hover:bg-background/80 rounded-sm p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {isAdding ? (
        <div className="flex items-center gap-1">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleAddTag}
            placeholder="Tag name..."
            className="h-6 text-xs w-24"
            autoFocus
          />
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="h-6 px-2 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Tag
        </Button>
      )}
    </div>
  );
};
