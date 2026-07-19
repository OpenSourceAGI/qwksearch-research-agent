import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { ChevronDown, HardDrive, Server, Cloud, Database, Check, FileText, Workflow } from 'lucide-react';
import { getFileSources, getActiveFileSourceId } from '../lib/file-sources/sources';
import { AnyFileSource } from '../types/fileSource';
import { cn } from '../lib/utils';

interface FileSourceDropdownProps {
  activeSourceId: string;
  onSourceChange: (sourceId: string) => void;
}

const getSourceIcon = (type: string) => {
  switch (type) {
    case 'local':
      return <HardDrive className="h-4 w-4" />;
    case 'ssh':
      return <Server className="h-4 w-4" />;
    case 's3':
      return <Cloud className="h-4 w-4" />;
    case 'r2':
      return <Database className="h-4 w-4" />;
    case 'b2':
      return <Cloud className="h-4 w-4" />;
    case 'gdocs':
      return <FileText className="h-4 w-4" />;
    case 'turso':
      return <Workflow className="h-4 w-4" />;
    default:
      return <HardDrive className="h-4 w-4" />;
  }
};

const getSourceTypeLabel = (type: string) => {
  switch (type) {
    case 'local':
      return 'Local';
    case 'ssh':
      return 'SSH';
    case 's3':
      return 'S3';
    case 'r2':
      return 'R2';
    case 'b2':
      return 'Backblaze B2';
    case 'gdocs':
      return 'Google Docs';
    case 'turso':
      return 'Turso DB';
    default:
      return type;
  }
};

export const FileSourceDropdown = ({ activeSourceId, onSourceChange }: FileSourceDropdownProps) => {
  const [sources, setSources] = useState<AnyFileSource[]>([]);
  const [activeSource, setActiveSource] = useState<AnyFileSource | null>(null);

  useEffect(() => {
    const loadedSources = getFileSources();
    setSources(loadedSources);
    const active = loadedSources.find((s) => s.id === activeSourceId);
    setActiveSource(active || loadedSources[0]);
  }, [activeSourceId]);

  const handleSourceSelect = (sourceId: string) => {
    const selected = sources.find((s) => s.id === sourceId);
    if (selected) {
      setActiveSource(selected);
      onSourceChange(sourceId);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between h-8 px-2 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {activeSource && getSourceIcon(activeSource.type)}
            <span className="truncate text-xs font-medium">
              {activeSource?.name || 'Select Source'}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 ml-1 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {sources.map((source, index) => (
          <div key={source.id}>
            {index > 0 && sources[index - 1]?.type !== source.type && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuItem
              onClick={() => handleSourceSelect(source.id)}
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
              {source.id === activeSourceId && (
                <Check className="h-4 w-4 ml-2 shrink-0" />
              )}
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
};
