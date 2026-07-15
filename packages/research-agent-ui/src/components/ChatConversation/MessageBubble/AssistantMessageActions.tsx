/**
 * Action toolbar below each AI response with rewrite, copy, read-aloud (TTS), export
 * (Markdown/PDF/DOCX/Google Docs), and "Open in LLM" (Claude/Perplexity/Gemini/ChatGPT) buttons.
 */
'use client';

import React from 'react';
import {
    Volume2,
    StopCircle,
    Download,
    FileText,
    FileType,
    FileDown,
    FileSpreadsheet,
    ExternalLink
} from 'lucide-react';
import { Section } from '../../../hooks/useChat';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem
} from '../../../ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../../ui/tooltip';
import Copy from '../../MessageActions/CopyMessageButton';
import Rewrite from '../../MessageActions/RewriteMessageButton';
import { exportAsMarkdown, exportAsDocx, exportAsPdf, exportToGoogleDocs } from '../../../lib/export';

interface AssistantMessageActionsProps {
    section: Section;
    speechStatus: string;
    start: () => void;
    stop: () => void;
    handleOpenInLLM: (platform: string) => void;
}

/**
 * Component for message actions related to the assistant's response.
 * Includes rewrite, copy, text-to-speech, export, and external LLM links.
 */
const AssistantMessageActions = ({
    section,
    speechStatus,
    start,
    stop,
    handleOpenInLLM,
}: AssistantMessageActionsProps) => {
    if (!section.assistantMessage) return null;

    return (
        <div className="flex flex-row items-center justify-end w-full text-foreground py-4 -mx-2">
            <div className="flex flex-row items-center space-x-1">
                <Rewrite
                    messageId={section.assistantMessage.messageId}
                />
                <Copy
                    initialMessage={section.assistantMessage.content}
                    section={section}
                />
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => {
                                if (speechStatus === 'started') {
                                    stop();
                                } else {
                                    start();
                                }
                            }}
                            className="p-2 text-muted-foreground rounded-full backdrop-blur-md bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 transition duration-200 hover:text-foreground"
                        >
                            {speechStatus === 'started' ? (
                                <StopCircle size={18} />
                            ) : (
                                <Volume2 size={18} />
                            )}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        {speechStatus === 'started' ? 'Stop' : 'Read aloud'}
                    </TooltipContent>
                </Tooltip>

                <DropdownMenu>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <button className="p-2 text-muted-foreground rounded-full backdrop-blur-md bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 transition duration-200 hover:text-foreground">
                                    <Download size={18} />
                                </button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Export</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end" side="top">
                        <DropdownMenuItem
                            onClick={() => exportAsMarkdown(
                                section.userMessage.content,
                                section.assistantMessage!.content,
                            )}
                        >
                            <FileText size={16} />
                            Markdown
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => exportAsPdf(
                                section.userMessage.content,
                                section.assistantMessage!.content,
                            )}
                        >
                            <FileType size={16} />
                            PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => exportAsDocx(
                                section.userMessage.content,
                                section.assistantMessage!.content,
                            )}
                        >
                            <FileDown size={16} />
                            DOCX
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => exportToGoogleDocs(
                                section.userMessage.content,
                                section.assistantMessage!.content,
                            )}
                        >
                            <FileSpreadsheet size={16} />
                            Google Docs
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <button className="p-2 text-muted-foreground rounded-full backdrop-blur-md bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 transition duration-200 hover:text-foreground">
                                    <ExternalLink size={18} />
                                </button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Open in LLM</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end" side="top">
                        <DropdownMenuItem onClick={() => handleOpenInLLM("qwksearch")}>
                            QwkSearch
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenInLLM("claude")}>
                            Claude
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenInLLM("perplexity")}>
                            Perplexity
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenInLLM("gemini")}>
                            Google Gemini
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenInLLM("chatgpt")}>
                            ChatGPT
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};

export default AssistantMessageActions;
