/**
 * @fileoverview Sticky navigation bar showing the abbreviated chat title and delete button.
 *
 * Shifts right when the article side panel is open on desktop. Share/export options moved to the message input bar.
 */
import { useEffect, useState } from 'react';
import { Edit } from 'lucide-react';
import DeleteChat from '../MessageActions/DeleteChatSessionButton';
import { useChat } from '../../hooks/useChat';
import { useExtractPanel } from '../ArticleReader/ExtractPanelContext';
const Navbar = () => {
  const [title, setTitle] = useState<string>('');
  const [isDesktop, setIsDesktop] = useState(false);

  const { sections, chatId } = useChat();
  const { isOpen: isPanelOpen, panelWidth } = useExtractPanel();

  // Track window width for desktop/mobile layout (1024px matches Tailwind lg: breakpoint)
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (sections.length > 0 && sections[0].userMessage) {
      const newTitle =
        sections[0].userMessage.content.length > 20
          ? `${sections[0].userMessage.content.substring(0, 20).trim()}...`
          : sections[0].userMessage.content;
      setTitle(newTitle);
    }
  }, [sections]);

  // Calculate container style based on panel state
  const containerStyle = isDesktop && isPanelOpen
    ? { marginRight: `${panelWidth}px` }
    : {};

  return (
    <div
      className="sticky -mx-4 lg:mx-0 top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50 transition-all duration-300"
      style={containerStyle}
    >
      <div className="px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <a
              href="/"
              className="lg:hidden mr-3 p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors duration-200"
            >
              <Edit size={18} className="text-muted-foreground" />
            </a>
          </div>

          <div className="flex-1 mx-4 min-w-0">
            <h1 className="text-center text-sm font-medium text-foreground truncate">
              {title || 'New Conversation'}
            </h1>
          </div>

          <div className="flex items-center gap-1 min-w-0">
            <DeleteChat
              redirect
              chatId={chatId!}
              chats={[]}
              setChats={() => { }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
