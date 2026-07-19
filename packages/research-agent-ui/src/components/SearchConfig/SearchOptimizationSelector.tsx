/**
 * Popover selector for the response optimization mode: Speed (fastest), Balanced, or Quality (coming soon).
 */
import { ChevronDown, Sliders, Star, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '../../ui/popover';

import { useChat } from '../../hooks/useChat';

const OptimizationModes = [
  {
    key: 'speed',
    title: 'Speed',
    description: 'Prioritize speed and get the quickest possible answer.',
    icon: <Zap size={16} className="text-chart-1" />,
  },
  {
    key: 'balanced',
    title: 'Balanced',
    description: 'Find the right balance between speed and accuracy',
    icon: <Sliders size={16} className="text-chart-2" />,
  },
  {
    key: 'quality',
    title: 'Quality (Soon)',
    description: 'Get the most thorough and accurate answer',
    icon: (
      <Star
        size={16}
        className="text-chart-3 fill-chart-3"
      />
    ),
  },
];

const Optimization = () => {
  const { optimizationMode, setOptimizationMode } = useChat();

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className="p-2 text-muted-foreground rounded-xl hover:bg-secondary active:scale-95 transition duration-200 hover:text-foreground focus:outline-none"
      >
        <div className="flex flex-row items-center space-x-1">
          {
            OptimizationModes.find((mode) => mode.key === optimizationMode)
              ?.icon
          }
          <ChevronDown
            size={16}
            className="transition duration-200"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 md:w-[250px] p-0">
        <div className="flex flex-col gap-2 bg-popover border rounded-lg border-border w-full p-4 max-h-[200px] md:max-h-none overflow-y-auto">
          {OptimizationModes.map((mode, i) => (
            <button
              onClick={() => setOptimizationMode(mode.key)}
              key={i}
              disabled={mode.key === 'quality'}
              className={cn(
                'p-2 rounded-lg flex flex-col items-start justify-start text-start space-y-1 duration-200 cursor-pointer transition focus:outline-none',
                optimizationMode === mode.key
                  ? 'bg-secondary'
                  : 'hover:bg-secondary',
                mode.key === 'quality' && 'opacity-50 cursor-not-allowed',
              )}
            >
              <div className="flex flex-row items-center space-x-1 text-popover-foreground">
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

export default Optimization;
