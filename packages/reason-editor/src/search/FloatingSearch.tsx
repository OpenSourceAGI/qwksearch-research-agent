/**
 * @module FloatingSearch
 * @description Compact search input with an embedded clear button used in the
 * sidebar toolbar to filter the file tree and outline in real time.
 */
import { Search, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { cn } from '../lib/utils';

/** Props for the {@link FloatingSearch} component. */
interface FloatingSearchProps {
  /** Current search string. */
  value: string;
  /** Called on every keystroke with the updated value. */
  onChange: (value: string) => void;
  /** Clears the input and resets the search. */
  onClear: () => void;
  /** Optional focus handler, e.g. to expand the sidebar on mobile. */
  onFocus?: () => void;
  /** Additional Tailwind classes applied to the wrapper `<div>`. */
  className?: string;
}

/**
 * Controlled search input with a leading search icon and a trailing ✕ button
 * that only appears when the input is non-empty.
 */
export const FloatingSearch = ({ value, onChange, onClear, onFocus, className }: FloatingSearchProps) => {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
      <Input
        type="text"
        placeholder="Search notes... (Ctrl+K)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        className="pl-9 pr-9 bg-sidebar-accent/80 backdrop-blur-sm border-sidebar-border focus-visible:ring-sidebar-ring shadow-lg"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 z-10"
          onClick={onClear}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};
