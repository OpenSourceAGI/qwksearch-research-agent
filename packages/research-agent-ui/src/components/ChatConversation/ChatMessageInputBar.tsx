/**
 * Follow-up message input bar in the active chat thread; auto-expands from single-line to multi-line,
 * supports file attachment, category picker, and a stop-streaming button while the AI is responding.
 */
import { cn } from '../../lib/utils';
import { ArrowUp, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import Attach from '../FileUpload/FileAttachmentButton';
import { File } from './ChatWindow';
import AttachSmall from '../FileUpload/CompactFileAttachmentButton';
import Category from '../SearchConfig/CategoriesMenu';
import Focus from '../SearchConfig/ResearchFocusToggleButton';
import { useChat } from '../../hooks/useChat';

/**
 * Input bar component for sending chat messages.
 * Features an auto-expanding textarea, file attachment buttons,
 * and search configuration menus (Focus, Category).
 * Handles 'Enter' to send and '/' to focus.
 * 
 * @returns {JSX.Element} The rendered message input bar
 */
const MessageInput = () => {
  const { loading, sendMessage, stopStreaming } = useChat();

  const [copilotEnabled, setCopilotEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [textareaRows, setTextareaRows] = useState(1);
  const [mode, setMode] = useState<'multi' | 'single'>('single');

  useEffect(() => {
    if (textareaRows >= 2 && message && mode === 'single') {
      setMode('multi');
    } else if (!message && mode === 'multi') {
      setMode('single');
    }
  }, [textareaRows, mode, message]);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;

      const isInputFocused =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.hasAttribute('contenteditable');

      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <form
      onSubmit={(e) => {
        if (loading) return;
        e.preventDefault();
        sendMessage(message);
        setMessage('');
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey && !loading) {
          e.preventDefault();
          sendMessage(message);
          setMessage('');
        }
      }}
      className={cn(
        'bg-secondary p-4 flex items-center overflow-hidden border border-border shadow-sm transition-all duration-200 focus-within:border-input',
        mode === 'multi' ? 'flex-col rounded-2xl' : 'flex-row rounded-full',
      )}
    >
      {mode === 'single' && (
        <AttachSmall />
      )}
      <TextareaAutosize
        ref={inputRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onHeightChange={(height, props) => {
          setTextareaRows(Math.ceil(height / props.rowHeight));
        }}
        className="transition bg-transparent placeholder:text-muted-foreground placeholder:text-sm text-sm text-foreground resize-none focus:outline-none w-full px-2 max-h-24 lg:max-h-36 xl:max-h-48 flex-grow flex-shrink"
        placeholder="Ask a follow-up"
      />
      {mode === 'single' && (
        <div className="flex flex-row items-center space-x-2">
          <div className="flex flex-row items-center space-x-1">
            <Category />
          </div>
          {loading ? (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); stopStreaming(); }}
              className="bg-red-500 text-white hover:bg-red-600 transition duration-100 rounded-full p-2"
            >
              <Square size={17} className="fill-current" />
            </button>
          ) : (
            <button
              disabled={message.trim().length === 0}
              className="bg-primary text-primary-foreground disabled:text-muted-foreground hover:bg-primary/85 transition duration-100 disabled:bg-muted rounded-full p-2"
            >
              <ArrowUp size={17} />
            </button>
          )}
        </div>
      )}
      {mode === 'multi' && (
        <div className="flex flex-row items-center justify-between w-full pt-2">
          <div className="flex flex-row items-center gap-1">
            <AttachSmall />
          </div>
          <div className="flex flex-row items-center gap-1">
            <AttachSmall />
          </div>
          <div className="flex flex-row items-center space-x-2">
            <div className="flex flex-row items-center space-x-1">
              <Category />
            </div>
            {/* <CopilotToggle
              copilotEnabled={copilotEnabled}
              setCopilotEnabled={setCopilotEnabled}
            /> */}
            {loading ? (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); stopStreaming(); }}
                className="bg-red-500 text-white hover:bg-red-600 transition duration-100 rounded-full p-2"
              >
                <Square size={17} className="fill-current" />
              </button>
            ) : (
              <button
                disabled={message.trim().length === 0}
                className="bg-primary text-primary-foreground disabled:text-muted-foreground hover:bg-primary/85 transition duration-100 disabled:bg-muted rounded-full p-2"
              >
                <ArrowUp size={17} />
              </button>
            )}
          </div>
        </div>
      )}
    </form>
  );
};

export default MessageInput;
