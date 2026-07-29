/**
 * @fileoverview Button that copies an assistant message and its citations to the clipboard.
 *
 * Renders a tooltip-wrapped icon button; on click it copies the message text plus a formatted list of
 * citation URLs, and briefly swaps its icon to a checkmark to confirm the copy.
 */
import { Check, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { Section } from '../../hooks/useChat';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../ui/tooltip';

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
