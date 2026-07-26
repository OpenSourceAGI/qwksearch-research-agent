/**
 * Displays the user's question as a collapsible heading with copy and inline-edit (resubmit) actions.
 */
'use client';

import React, { useRef } from 'react';
import { ChevronDown, ChevronRight, Check, ClipboardList, Pencil } from 'lucide-react';
import { cn, formatMessageTime } from '../../../lib/utils';
import { Section } from '../../../hooks/useChat';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../../ui/tooltip';
import MessageAttachments from './MessageAttachments';

interface UserMessageHeaderProps {
    section: Section;
    isExpanded: boolean;
    setIsExpanded: (expanded: boolean) => void;
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;
    editText: string;
    setEditText: (text: string) => void;
    handleEditSubmit: () => void;
    copiedUserMsg: boolean;
    handleCopyUserMsg: () => void;
}

/**
 * Component for the user message header in a chat bubble.
 * Handles expansion toggle, message text display, and copy/edit actions.
 */
const UserMessageHeader = ({
    section,
    isExpanded,
    setIsExpanded,
    isEditing,
    setIsEditing,
    editText,
    setEditText,
    handleEditSubmit,
    copiedUserMsg,
    handleCopyUserMsg,
}: UserMessageHeaderProps) => {
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);

    return (
        <div className="w-full pt-8 break-words">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-3 group text-left w-full"
            >
                <div className="flex-shrink-0 p-1.5 rounded-lg bg-secondary/50 group-hover:bg-secondary transition-colors duration-200">
                    {isExpanded ? (
                        <ChevronDown size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                    ) : (
                        <ChevronRight size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                    )}
                </div>
                <h2 className="text-foreground font-medium text-lg lg:text-3xl lg:w-9/12 group-hover:text-foreground/80 transition-colors line-clamp-3 lg:line-clamp-none">
                    {section.userMessage.content}
                </h2>
            </button>

            {/* User message actions: timestamp, copy & edit */}
            <div className="flex items-center gap-0.5 mt-1 ml-10">
                {(() => {
                    const timestamp = formatMessageTime(section.userMessage.createdAt);
                    return timestamp ? (
                        <time
                            dateTime={new Date(section.userMessage.createdAt).toISOString()}
                            className="mr-1.5 text-xs text-muted-foreground tabular-nums select-none"
                        >
                            {timestamp}
                        </time>
                    ) : null;
                })()}

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={handleCopyUserMsg}
                            className="p-1.5 text-muted-foreground rounded-lg hover:bg-secondary transition-all duration-200 hover:text-foreground"
                        >
                            <span
                                className={cn(
                                    'flex items-center transition-all duration-300',
                                    copiedUserMsg ? 'scale-110' : 'scale-100',
                                )}
                            >
                                {copiedUserMsg ? (
                                    <Check size={14} className="text-green-500" />
                                ) : (
                                    <ClipboardList size={14} />
                                )}
                            </span>
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        {copiedUserMsg ? 'Copied!' : 'Copy prompt'}
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => {
                                setEditText(section.userMessage.content);
                                setIsEditing(true);
                                setTimeout(() => editTextareaRef.current?.focus(), 50);
                            }}
                            className="p-1.5 text-muted-foreground rounded-lg hover:bg-secondary transition-all duration-200 hover:text-foreground"
                        >
                            <Pencil size={14} />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Edit &amp; resubmit</TooltipContent>
                </Tooltip>
            </div>

            {/* Files attached to this message */}
            <MessageAttachments files={section.userMessage.files} />

            {/* Inline edit form */}
            {isEditing && (
                <div className="mt-3 ml-10 flex flex-col gap-2">
                    <textarea
                        ref={editTextareaRef}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleEditSubmit();
                            }
                            if (e.key === 'Escape') setIsEditing(false);
                        }}
                        rows={3}
                        className="w-full rounded-xl border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                    />
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-3 py-1.5 text-sm text-muted-foreground rounded-lg hover:bg-secondary transition-colors duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleEditSubmit}
                            disabled={!editText.trim()}
                            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            Resubmit
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserMessageHeader;
