/**
 * Popover toggle for selecting the research focus mode: All web, Academic, Writing (no search),
 * Wolfram Alpha, YouTube, or Reddit.
 */
import { Globe } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '../../ui/popover';
import { focusModes } from './focusModes';

import { useChat } from '../../hooks/useChat';

const Focus = () => {
  const { focusMode, setFocusMode } = useChat();

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className="active:border-none hover:bg-accent p-2 rounded-lg focus:outline-none data-[state=open]:text-popover-foreground text-muted-foreground active:scale-95 transition duration-200 hover:text-foreground"
      >
        {focusMode !== 'webSearch' ? (
          <div className="flex flex-row items-center space-x-1">
            {focusModes.find((mode) => mode.key === focusMode)?.icon}
          </div>
        ) : (
          <div className="flex flex-row items-center space-x-1">
            <Globe size={16} />
          </div>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 md:w-[500px] p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 bg-popover border rounded-lg border-border w-full p-4 max-h-[200px] md:max-h-none overflow-y-auto">
          {focusModes.map((mode, i) => (
            <button
              onClick={() => setFocusMode(mode.key)}
              key={i}
              className={cn(
                'p-2 rounded-lg flex flex-col items-start justify-start text-start space-y-2 duration-200 cursor-pointer transition focus:outline-none',
                focusMode === mode.key
                  ? 'bg-secondary'
                  : 'hover:bg-secondary',
              )}
            >
              <div
                className={cn(
                  'flex flex-row items-center space-x-1',
                  focusMode === mode.key
                    ? 'text-primary'
                    : 'text-popover-foreground',
                )}
              >
                {mode.icon}
                <p className="text-sm font-medium">{mode.title}</p>
              </div>
              <p className="text-muted-foreground text-xs">
                {mode.description}
              </p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default Focus;
