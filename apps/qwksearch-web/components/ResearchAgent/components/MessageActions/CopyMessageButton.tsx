/**
 * Button that copies the assistant message text plus citation URLs to the clipboard, showing a brief
 * checkmark confirmation after a successful copy.
 */
import { Check, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { Section } from '@/components/ResearchAgent/hooks/useChat';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const Copy = ({
  section,
  initialMessage,
}: {
  section: Section;
  initialMessage: string;
}) => {
  const [copied, setCopied] = useState(false);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => {
            const contentToCopy = `${initialMessage}${section?.sourceMessage?.sources && section.sourceMessage.sources.length > 0 && `\n\nCitations:\n${section.sourceMessage.sources?.map((source: any, i: any) => `[${i + 1}] ${source.metadata.url}`).join(`\n`)}`}`;
            navigator.clipboard.writeText(contentToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 1000);
          }}
          className="p-2 text-black/70 dark:text-white/70 rounded-xl hover:bg-light-secondary dark:hover:bg-dark-secondary transition duration-200 hover:text-black dark:hover:text-white"
        >
          {copied ? <Check size={18} /> : <ClipboardList size={18} />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {copied ? 'Copied!' : 'Copy'}
      </TooltipContent>
    </Tooltip>
  );
};

export default Copy;
