/**
 * Animated spotlight search input with category shortcut buttons that appear on hover (blob SVG filter effect),
 * model selection, and an optimization selector; used as an alternative homepage input.
 */
'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Cpu, Search } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat';
import { categories } from '../SearchConfig/categories';
import ModelSelector from '../SearchConfig/ChatModelSelector';
import Attach from '../FileUpload/FileAttachmentButton';
import Optimization from '../SearchConfig/SearchOptimizationSelector';

/**
 * SVG filter for creating a "blob" effect on elements.
 * Used for the search spotlight animation background.
 */
const SVGFilter = () => {
  return (
    <svg width="0" height="0">
      <filter id="blob">
        <feGaussianBlur stdDeviation="10" in="SourceGraphic" />
        <feColorMatrix
          values="
      1 0 0 0 0
      0 1 0 0 0
      0 0 1 0 0
      0 0 0 18 -9
    "
          result="blob"
        />
        <feBlend in="SourceGraphic" in2="blob" />
      </filter>
    </svg>
  );
};

interface ShortcutButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

/**
 * A shortcut button for selecting search categories.
 * 
 * @param icon - The icon element or image to display
 * @param label - The accessibility label for the button
 * @param isActive - Whether the shortcut is currently selected
 * @param onClick - Callback when the shortcut is clicked
 */
const ShortcutButton = ({ icon, label, isActive, onClick }: ShortcutButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full cursor-pointer hover:shadow-lg transition-all duration-200',
        isActive ? 'opacity-100 scale-110' : 'opacity-30 hover:opacity-100'
      )}
    >
      <div className="size-16 aspect-square flex items-center justify-center">{icon}</div>
    </button>
  );
};

interface SpotlightPlaceholderProps {
  text: string;
  className?: string;
}

/**
 * Animated placeholder text for the spotlight input.
 * 
 * @param text - The placeholder text to display
 * @param className - Optional CSS classes for styling
 */
const SpotlightPlaceholder = ({ text, className }: SpotlightPlaceholderProps) => {
  return (
    <motion.div
      layout
      className={cn('absolute text-gray-500 flex items-center pointer-events-none z-10', className)}
    >
      <AnimatePresence mode="popLayout">
        <motion.p
          layoutId={`placeholder-${text}`}
          key={`placeholder-${text}`}
          initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {text}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
};

interface SpotlightInputProps {
  placeholder: string;
  hidePlaceholder: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholderClassName?: string;
}

/**
 * The core input field for the search spotlight.
 * Handles focus, key events, and placeholder visibility.
 * 
 * @param props - Input field properties
 */
const SpotlightInput = ({
  placeholder,
  hidePlaceholder,
  value,
  onChange,
  onSubmit,
  placeholderClassName
}: SpotlightInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the input when the component mounts
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="flex items-center w-full justify-start gap-3 px-4 py-3 sm:px-6 sm:py-4">
      <motion.div layoutId="search-icon">
        <Search className="text-black/60 sm:size-6 size-5" />
      </motion.div>
      <div className="flex-1 relative text-base sm:text-lg">
        {!hidePlaceholder && (
          <SpotlightPlaceholder text={placeholder} className={placeholderClassName} />
        )}

        <motion.input
          ref={inputRef}
          layout="position"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent outline-none ring-none text-black placeholder:text-gray-500"
        />
      </div>
    </div>
  );
};

/**
 * Spotlight search component for the chat interface.
 * Features a blob-like animation, category shortcuts, and model selection.
 * Typically used as the initial interaction point on the homepage.
 * 
 * @returns {JSX.Element} The rendered spotlight search panel
 */
const SearchSpotlight = () => {
  const { sendMessage, category, setCategory, chatModelProvider } = useChat();
  const [hovered, setHovered] = useState(false);
  const [hoveredShortcut, setHoveredShortcut] = useState<number | null>(null);
  const [searchValue, setSearchValue] = useState('');

  const handleSearchValueChange = (value: string) => {
    setSearchValue(value);
  };

  const handleSubmit = () => {
    if (searchValue.trim().length === 0) return;
    sendMessage(searchValue);
    setSearchValue('');
  };

  const handleCategoryClick = (categoryCode: string) => {
    setCategory(categoryCode);
  };

  const selectedCategory = categories.find((cat) => cat.code === category) || categories[0];

  return (
    <div className="w-full">
      <SVGFilter />

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setHoveredShortcut(null);
        }}
        style={{ filter: 'url(#blob)' }}
        className={cn(
          'w-full flex items-center justify-end gap-4 group',
          '[&>div]:bg-neutral-100 [&>div]:text-black [&>div]:rounded-full',
          '[&_svg]:size-6 [&_svg]:stroke-[1.4]'
        )}
      >
        <AnimatePresence mode="popLayout">
          <motion.div
            layoutId="search-input-container"
            transition={{
              layout: {
                duration: 0.5,
                type: 'spring',
                bounce: 0.2
              }
            }}
            style={{
              borderRadius: '30px'
            }}
            className="h-full w-full flex flex-col items-center justify-start relative shadow-lg overflow-hidden border border-border bg-white"
          >
            <SpotlightInput
              placeholder={
                hoveredShortcut !== null
                  ? categories[hoveredShortcut].name
                  : 'What are you curious to research?'
              }
              placeholderClassName="text-gray-500"
              hidePlaceholder={searchValue.length > 0}
              value={searchValue}
              onChange={handleSearchValueChange}
              onSubmit={handleSubmit}
            />

            {/* Action buttons row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full px-3 pb-2 sm:px-4 sm:pb-3 border-t border-border/50 pt-2 sm:pt-3 bg-neutral-50 gap-2 sm:gap-0">
              <Optimization />
              <div className="flex flex-row items-center justify-end space-x-2">
                <div className="flex flex-row items-center space-x-1">
                  <ModelSelector />
                  <Attach />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={searchValue.trim().length === 0}
                  className="bg-primary text-primary-foreground disabled:text-muted-foreground disabled:bg-muted hover:bg-primary/85 transition duration-100 rounded-full p-2"
                >
                  <ArrowRight className="bg-background" size={17} />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Category shortcuts */}
          {hovered &&
            !searchValue &&
            categories.map((cat, index) => (
              <motion.div
                key={`shortcut-${cat.code}`}
                onMouseEnter={() => setHoveredShortcut(index)}
                layout
                initial={{ scale: 0.7, x: -1 * (64 * (index + 1)) }}
                animate={{ scale: 1, x: 0 }}
                exit={{
                  scale: 0.7,
                  x:
                    1 *
                    (16 * (categories.length - index - 1) + 64 * (categories.length - index - 1))
                }}
                transition={{
                  duration: 0.8,
                  type: 'spring',
                  bounce: 0.2,
                  delay: index * 0.05
                }}
                className="rounded-full cursor-pointer"
              >
                <ShortcutButton
                  icon={<Image src={cat.icon} alt={cat.name} width={32} height={32} className="size-8" />}
                  label={cat.name}
                  isActive={category === cat.code}
                  onClick={() => handleCategoryClick(cat.code)}
                />
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SearchSpotlight;
