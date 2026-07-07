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
          className="p-2 text-muted-foreground rounded-full backdrop-blur-md bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 transition duration-200 hover:text-foreground"
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
