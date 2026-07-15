/**
 * Sticky navigation bar showing the abbreviated chat title, Markdown/PDF export options, and a delete-chat
 * button; shifts right when the article side panel is open on desktop.
 */
import { Edit, Share, Trash, FileText, FileDown } from 'lucide-react';
import { Message } from './ChatWindow';
import { useEffect, useState } from 'react';
import DeleteChat from '../MessageActions/DeleteChatSessionButton';
import { Popover, PopoverTrigger, PopoverContent } from '../../ui/popover';
import { loadJsPDF } from '../../lib/cdn-loader';
import { useChat, Section } from '../../hooks/useChat';
import { useExtractPanel } from '../ArticleReader/ExtractPanelContext';

/**
 * Utility function to initiate a file download in the browser.
 * 
 * @param filename - The name of the file to be downloaded
 * @param content - The string content of the file
 * @param type - The MIME type of the file
 */
const downloadFile = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
};

/**
 * Exports the chat conversation sections as a Markdown file.
 * Formats user and assistant messages with timestamps and blockquotes.
 * 
 * @param sections - The array of chat sections to export
 * @param title - The title for the export file and document header
 */
const exportAsMarkdown = (sections: Section[], title: string) => {
  const date = new Date(
    sections[0]?.userMessage?.createdAt || Date.now(),
  ).toLocaleString();
  let md = `# 💬 Chat Export: ${title}\n\n`;
  md += `*Exported on: ${date}*\n\n---\n`;

  sections.forEach((section, idx) => {
    if (section.userMessage) {
      md += `\n---\n`;
      md += `**User**  
`;
      md += `*${new Date(section.userMessage.createdAt).toLocaleString()}*\n\n`;
      md += `> ${section.userMessage.content.replace(/\n/g, '\n> ')}\n`;
    }

    if (section.assistantMessage) {
      md += `\n---\n`;
      md += `**Assistant**  
`;
      md += `*${new Date(section.assistantMessage.createdAt).toLocaleString()}*\n\n`;
      md += `> ${section.assistantMessage.content.replace(/\n/g, '\n> ')}\n`;
    }

    if (
      section.sourceMessage &&
      section.sourceMessage.sources &&
      section.sourceMessage.sources.length > 0
    ) {
      md += `\n**Citations:**\n`;
      section.sourceMessage.sources.forEach((src: any, i: number) => {
        const url = src.metadata?.url || '';
        md += `- [${i + 1}] [${url}](${url})\n`;
      });
    }
  });
  md += '\n---\n';
  downloadFile(`${title || 'chat'}.md`, md, 'text/markdown');
};

/**
 * Exports the chat conversation sections as a PDF document.
 * Handles pagination and basic styling for user/assistant messages and citations.
 * 
 * @param sections - The array of chat sections to export
 * @param title - The title for the PDF header and filename
 */
const exportAsPDF = async (sections: Section[], title: string) => {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF();
  const date = new Date(
    sections[0]?.userMessage?.createdAt || Date.now(),
  ).toLocaleString();
  let y = 15;
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(18);
  doc.text(`Chat Export: ${title}`, 10, y);
  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Exported on: ${date}`, 10, y);
  y += 8;
  doc.setDrawColor(200);
  doc.line(10, y, 200, y);
  y += 6;
  doc.setTextColor(30);

  sections.forEach((section, idx) => {
    if (section.userMessage) {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 15;
      }
      doc.setFont('helvetica', 'bold');
      doc.text('User', 10, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(
        `${new Date(section.userMessage.createdAt).toLocaleString()}`,
        40,
        y,
      );
      y += 6;
      doc.setTextColor(30);
      doc.setFontSize(12);
      const userLines = doc.splitTextToSize(section.userMessage.content, 180);
      for (let i = 0; i < userLines.length; i++) {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 15;
        }
        doc.text(userLines[i], 12, y);
        y += 6;
      }
      y += 6;
      doc.setDrawColor(230);
      if (y > pageHeight - 10) {
        doc.addPage();
        y = 15;
      }
      doc.line(10, y, 200, y);
      y += 4;
    }

    if (section.assistantMessage) {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 15;
      }
      doc.setFont('helvetica', 'bold');
      doc.text('Assistant', 10, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(
        `${new Date(section.assistantMessage.createdAt).toLocaleString()}`,
        40,
        y,
      );
      y += 6;
      doc.setTextColor(30);
      doc.setFontSize(12);
      const assistantLines = doc.splitTextToSize(
        section.assistantMessage.content,
        180,
      );
      for (let i = 0; i < assistantLines.length; i++) {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 15;
        }
        doc.text(assistantLines[i], 12, y);
        y += 6;
      }

      if (
        section.sourceMessage &&
        section.sourceMessage.sources &&
        section.sourceMessage.sources.length > 0
      ) {
        doc.setFontSize(11);
        doc.setTextColor(80);
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 15;
        }
        doc.text('Citations:', 12, y);
        y += 5;
        section.sourceMessage.sources.forEach((src: any, i: number) => {
          const url = src.metadata?.url || '';
          if (y > pageHeight - 15) {
            doc.addPage();
            y = 15;
          }
          doc.text(`- [${i + 1}] ${url}`, 15, y);
          y += 5;
        });
        doc.setTextColor(30);
      }
      y += 6;
      doc.setDrawColor(230);
      if (y > pageHeight - 10) {
        doc.addPage();
        y = 15;
      }
      doc.line(10, y, 200, y);
      y += 4;
    }
  });
  doc.save(`${title || 'chat'}.pdf`);
};

/**
 * Navigation bar component for the chat interface.
 * Displays the chat title, share/export options, and delete button.
 * Adjusts layout based on desktop/mobile and side panel state.
 * 
 * @returns {JSX.Element} The rendered navigation bar
 */
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
            <Popover>
              <PopoverTrigger className="p-2 rounded-lg hover:bg-secondary transition-colors duration-200">
                <Share size={16} className="text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 rounded-2xl bg-popover border border-border shadow-xl z-50">
                <div className="p-3">
                  <div className="mb-2">
                    <p className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">
                      Export Chat
                    </p>
                  </div>
                  <div className="space-y-1">
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-xl hover:bg-secondary transition-colors duration-200"
                      onClick={() => exportAsMarkdown(sections, title || '')}
                    >
                      <FileText size={16} className="text-primary" />
                      <div>
                        <p className="text-sm font-medium text-popover-foreground">
                          Markdown
                        </p>
                        <p className="text-xs text-muted-foreground">
                          .md format
                        </p>
                      </div>
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-xl hover:bg-secondary transition-colors duration-200"
                      onClick={() => exportAsPDF(sections, title || '')}
                    >
                      <FileDown size={16} className="text-primary" />
                      <div>
                        <p className="text-sm font-medium text-popover-foreground">
                          PDF
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Document format
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
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
