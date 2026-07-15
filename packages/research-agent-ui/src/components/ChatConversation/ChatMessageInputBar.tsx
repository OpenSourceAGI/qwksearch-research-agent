/**
 * Follow-up message input bar in the active chat thread; auto-expands from single-line to multi-line,
 * supports file attachment, category picker, search options, export menu, and a stop-streaming button while the AI is responding.
 */
import { cn } from '../../lib/utils';
import { ArrowUp, Square, Share, FileText, FileDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import Attach from '../FileUpload/FileAttachmentButton';
import { File } from './ChatWindow';
import AttachSmall from '../FileUpload/CompactFileAttachmentButton';
import Category from '../SearchConfig/CategoriesMenu';
import Focus from '../SearchConfig/ResearchFocusToggleButton';
import { useChat, Section } from '../../hooks/useChat';
import { Popover, PopoverTrigger, PopoverContent } from '../../ui/popover';
import { exportAsMarkdown, exportAsPdf } from '../../lib/export';

/**
 * Input bar component for sending chat messages.
 * Features an auto-expanding textarea, file attachment buttons,
 * and search configuration menus (Focus, Category).
 * Handles 'Enter' to send and '/' to focus.
 * 
 * @returns {JSX.Element} The rendered message input bar
 */
const MessageInput = () => {
  const { loading, sendMessage, stopStreaming, sections } = useChat();

  const [copilotEnabled, setCopilotEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [textareaRows, setTextareaRows] = useState(1);
  const [mode, setMode] = useState<'multi' | 'single'>('single');
  const [title, setTitle] = useState<string>('');

  useEffect(() => {
    if (textareaRows >= 2 && message && mode === 'single') {
      setMode('multi');
    } else if (!message && mode === 'multi') {
      setMode('single');
    }
  }, [textareaRows, mode, message]);

  useEffect(() => {
    if (sections.length > 0 && sections[0].userMessage) {
      const newTitle =
        sections[0].userMessage.content.length > 20
          ? `${sections[0].userMessage.content.substring(0, 20).trim()}...`
          : sections[0].userMessage.content;
      setTitle(newTitle);
    }
  }, [sections]);

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
          <Popover>
            <PopoverTrigger className="p-2 rounded-lg hover:bg-secondary transition-colors duration-200">
              <Share size={16} className="text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 rounded-xl bg-popover border border-border shadow-xl z-50">
              <div className="p-2 space-y-1">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-lg hover:bg-secondary transition-colors duration-200"
                  onClick={() => {
                    const htmlContent = document.body.innerHTML;
                    exportAsMarkdown(title || 'chat', htmlContent);
                  }}
                >
                  <FileText size={14} className="text-primary" />
                  <span className="font-medium text-popover-foreground">Markdown</span>
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-lg hover:bg-secondary transition-colors duration-200"
                  onClick={() => {
                    const htmlContent = document.body.innerHTML;
                    exportAsPdf(title || 'chat', htmlContent);
                  }}
                >
                  <FileDown size={14} className="text-primary" />
                  <span className="font-medium text-popover-foreground">PDF</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
          <a
            href="/"
            className="p-2 rounded-lg hover:bg-secondary transition-colors duration-200"
            title="New chat"
          >
            <Square size={16} className="text-muted-foreground" />
          </a>
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
            <Category />
            <Popover>
              <PopoverTrigger className="p-2 rounded-lg hover:bg-secondary transition-colors duration-200">
                <Share size={16} className="text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 rounded-xl bg-popover border border-border shadow-xl z-50">
                <div className="p-2 space-y-1">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-lg hover:bg-secondary transition-colors duration-200"
                    onClick={() => {
                      const htmlContent = document.body.innerHTML;
                      exportAsMarkdown(title || 'chat', htmlContent);
                    }}
                  >
                    <FileText size={14} className="text-primary" />
                    <span className="font-medium text-popover-foreground">Markdown</span>
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-lg hover:bg-secondary transition-colors duration-200"
                    onClick={() => {
                      const htmlContent = document.body.innerHTML;
                      exportAsPdf(title || 'chat', htmlContent);
                    }}
                  >
                    <FileDown size={14} className="text-primary" />
                    <span className="font-medium text-popover-foreground">PDF</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
            <a
              href="/"
              className="p-2 rounded-lg hover:bg-secondary transition-colors duration-200"
              title="New chat"
            >
              <Square size={16} className="text-muted-foreground" />
            </a>
          </div>
          <div className="flex flex-row items-center space-x-2">
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
