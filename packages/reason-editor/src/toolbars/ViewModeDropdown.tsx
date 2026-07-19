import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Eye, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export type ViewMode = 'formatted' | 'html' | 'markdown';

interface ViewModeDropdownProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewModeDropdown = ({ value, onChange }: ViewModeDropdownProps) => {


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="View mode">
          <Eye className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onChange('formatted')}>
          <Check className={cn('mr-2 h-4 w-4', value !== 'formatted' && 'opacity-0')} />
          Formatted text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange('html')}>
          <Check className={cn('mr-2 h-4 w-4', value !== 'html' && 'opacity-0')} />
          HTML
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange('markdown')}>
          <Check className={cn('mr-2 h-4 w-4', value !== 'markdown' && 'opacity-0')} />
          Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
