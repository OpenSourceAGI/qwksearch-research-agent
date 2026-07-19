/**
 * Large full-featured input for the empty-chat homepage, adds Model and Optimization selectors
 * not present in the follow-up bar; auto-focuses on mount and submits via Enter.
 */
import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import Category from '../SearchConfig/CategoriesMenu';
import Optimization from '../SearchConfig/SearchOptimizationSelector';
import Attach from '../FileUpload/FileAttachmentButton';
import { useChat } from '../../hooks/useChat';
import ModelSelector from '../SearchConfig/ChatModelSelector';

/**
 * Specialized input component for the empty chat state (homepage).
 * Features a larger textarea and additional configuration selectors
 * like Model and Optimization.
 * 
 * @returns {JSX.Element} The rendered empty state input
 */
const EmptyChatMessageInput = () => {
  const { sendMessage } = useChat();

  /* const [copilotEnabled, setCopilotEnabled] = useState(false); */
  const [message, setMessage] = useState('');

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

    inputRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        sendMessage(message);
        setMessage('');
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage(message);
          setMessage('');
        }
      }}
      className="w-full"
    >
      <div className="flex flex-col bg-secondary px-3 pt-5 pb-3 rounded-2xl w-full border border-border shadow-sm transition-all duration-200 focus-within:border-input">
        <TextareaAutosize
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          minRows={2}
          className="px-2 bg-transparent placeholder:text-[15px] placeholder:text-muted-foreground text-sm text-foreground resize-none focus:outline-none w-full max-h-24 lg:max-h-36 xl:max-h-48"
          placeholder="What are you curious to research?"
        />
        <div className="flex flex-row items-center justify-between mt-4">
          <Optimization />
          <div className="flex flex-row items-center space-x-2">
            <div className="flex flex-row items-center space-x-1">
              <ModelSelector />
              <Category />
              <Attach />
            </div>
            <button
              disabled={message.trim().length === 0}
              className="bg-primary text-primary-foreground disabled:text-muted-foreground disabled:bg-muted hover:bg-primary/85 transition duration-100 rounded-full p-2"
            >
              <ArrowRight className="bg-background" size={17} />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default EmptyChatMessageInput;
