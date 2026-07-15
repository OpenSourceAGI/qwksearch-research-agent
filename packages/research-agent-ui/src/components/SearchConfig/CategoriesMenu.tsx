/**
 * Popover button showing a grid of search category icons (Web, News, Videos, Images, Academic, Files, Tech)
 * for selecting the active search category used in each chat request.
 */
import { cn } from '../../lib/utils';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '../../ui/popover';

import { useChat } from '../../hooks/useChat';
import { categories } from './categories';

const Category = () => {
  const { category, setCategory } = useChat();

  const selectedCategory = categories.find((cat) => cat.code === category) || categories[0];

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className="active:border-none hover:bg-accent p-2 rounded-lg focus:outline-none data-[state=open]:text-popover-foreground text-muted-foreground active:scale-95 transition duration-200 hover:text-foreground"
      >
        <div className="flex flex-row items-center space-x-1">
          <selectedCategory.icon className="w-4 h-4" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 md:w-[400px] p-0">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-popover border rounded-lg border-border w-full p-4 max-h-[200px] md:max-h-none overflow-y-auto">
          {categories.map((cat, i) => (
            <button
              onClick={() => setCategory(cat.code)}
              key={i}
              className={cn(
                'p-2 rounded-lg flex flex-col items-center justify-center text-center space-y-2 duration-200 cursor-pointer transition focus:outline-none',
                category === cat.code
                  ? 'bg-secondary'
                  : 'hover:bg-secondary',
              )}
            >
              <div
                className={cn(
                  'flex flex-col items-center space-y-1',
                  category === cat.code
                    ? 'text-primary'
                    : 'text-popover-foreground',
                )}
              >
                <cat.icon className="w-5 h-5" />
                <p className="text-sm font-medium">{cat.name}</p>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default Category;
