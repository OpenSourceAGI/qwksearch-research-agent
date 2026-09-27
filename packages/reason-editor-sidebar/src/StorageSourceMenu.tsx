/**
 * @module StorageSourceMenu
 * @description Dropdown for switching the active storage (file) source. Shown
 * in the "Files" panel header, with a fallback in the sidebar footer when the
 * Files panel isn't on screen.
 */
import type { ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './app-ui/dropdown-menu';
import { Check } from 'lucide-react';
import type { AnyFileSource } from './app-types/fileSource';
import { getSourceIcon, getSourceTypeLabel } from './fileSourceUtils';

/** Props for the {@link StorageSourceMenu} component. */
export interface StorageSourceMenuProps {
  /** Available file source configurations. */
  sources: AnyFileSource[];
  /** The currently active file source object, or `null` if none selected. */
  activeSource?: AnyFileSource | null;
  /** ID of the currently active file source. */
  activeFileSourceId?: string;
  /** Selects a source by ID. */
  onSourceSelect?: (sourceId: string) => void;
  /** Wraps the trigger icon in the host's button (receives the source icon). */
  renderTrigger: (icon: ReactNode, label: string) => ReactNode;
  /** Side the menu opens toward. */
  side?: 'top' | 'bottom';
  /** Alignment of the menu relative to the trigger. */
  align?: 'start' | 'end';
}

/** Storage-source switcher dropdown with a host-supplied trigger button. */
export const StorageSourceMenu = ({
  sources,
  activeSource,
  activeFileSourceId,
  onSourceSelect,
  renderTrigger,
  side = 'bottom',
  align = 'end',
}: StorageSourceMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      {renderTrigger(
        getSourceIcon(activeSource?.type ?? 'local'),
        `Storage Source: ${activeSource?.name || 'Select Source'}`,
      )}
    </DropdownMenuTrigger>
    <DropdownMenuContent align={align} side={side} className="w-56">
      {sources.map((source, index) => (
        <div key={source.id}>
          {index > 0 && sources[index - 1]?.type !== source.type && <DropdownMenuSeparator />}
          <DropdownMenuItem
            onClick={() => onSourceSelect?.(source.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {getSourceIcon(source.type)}
              <div className="flex flex-col flex-1 min-w-0">
                <span className="truncate text-sm">{source.name}</span>
                <span className="text-xs text-muted-foreground">
                  {getSourceTypeLabel(source.type)}
                </span>
              </div>
            </div>
            {source.id === activeFileSourceId && <Check className="h-4 w-4 ml-2 shrink-0" />}
          </DropdownMenuItem>
        </div>
      ))}
      {sources.length === 1 && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="text-xs text-center text-muted-foreground">
            Add sources in Settings
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
);
