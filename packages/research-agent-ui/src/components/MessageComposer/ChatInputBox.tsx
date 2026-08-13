/**
 * @fileoverview Primary animated chat input box for the composer.
 *
 * Renders a cycling animated placeholder, a debounced autocomplete/domain-suggestion dropdown, drag-and-drop
 * and paste file handling, a voice-input waveform, and an attachment tray for files and pasted content.
 */
"use client"

import React, { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Icons } from "./MessageInputIconSet";
import { FilePreviewCard } from "../FileUpload/FilePreviewCard";
import { PastedContentCard } from "./PastedContentCard";
import { useChat } from '../../hooks/useChat';
import { useSpeechInput } from '../../hooks/voice/useSpeechToTranscript';
import { useFileHandling } from '../FileUpload/useFileHandling';
import FileUploadDropdown from '../FileUpload/FileUploadDropdown';
import { LiveWaveform } from '../../ui/live-waveform';
import { autocomplete } from 'qwksearch-api-client';

interface DomainSuggestion {
    domain: string;
    name: string;
    favicon: string;
    rank: number;
}

const PLACEHOLDERS = [
  "What are you curious to research?",
  "Search the latest news...",
  "Analyze a video, doc, or URL...",
  "Find academic research on...",
  "Compare products to buy...",
];

const placeholderContainerVariants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.025 } },
  exit: { transition: { staggerChildren: 0.015, staggerDirection: -1 } },
};

const letterVariants = {
  initial: { opacity: 0, filter: "blur(12px)", y: 10 },
  animate: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: {
      opacity: { duration: 0.25 },
      filter: { duration: 0.4 },
      y: { type: "spring" as const, stiffness: 80, damping: 20 },
    },
  },
  exit: {
    opacity: 0,
    filter: "blur(12px)",
    y: -10,
    transition: {
      opacity: { duration: 0.2 },
      filter: { duration: 0.3 },
      y: { type: "spring" as const, stiffness: 80, damping: 20 },
    },
  },
};

interface ChatInputBoxProps {
    onNewChat?: () => void;
}

const ChatInputBox = ({ onNewChat }: ChatInputBoxProps) => {
    const { loading, sendMessage, stopStreaming, files: contextFiles, fileIds: contextFileIds, setFiles: setContextFiles, setFileIds: setContextFileIds, newChat, sections } = useChat();
    const [message, setMessage] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const {
        files, setFiles,
        pastedContent, setPastedContent,
        isDragging,
        handleFiles,
        onDragOver, onDragLeave, onDrop,
        handlePaste,
        resetAttachments,
    } = useFileHandling({
        setMessage,
        contextFiles,
        contextFileIds,
        setContextFiles,
        setContextFileIds,
    });

    const resetInput = () => {
        setMessage("");
        resetAttachments();
        if (textareaRef.current) textareaRef.current.style.height = "auto";
    };

    const { isListening, toggleSpeech, isSpeechSupported } = useSpeechInput(
        (transcript) => setMessage(transcript),
        () => {
            setMessage(prev => {
                if (prev.trim()) {
                    setTimeout(() => {
                        sendMessage(prev);
                        resetInput();
                    }, 0);
                }
                return prev;
            });
        }
    );

    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [showPlaceholder, setShowPlaceholder] = useState(true);
    const [isActive, setIsActive] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [domainSuggestions, setDomainSuggestions] = useState<DomainSuggestion[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<'below' | 'above'>('below');
    const suppressNextFetchRef = useRef(false);
    const autocompleteAbortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (suppressNextFetchRef.current) {
            suppressNextFetchRef.current = false;
            return;
        }
        const { query: searchQuery } = getLastWords(message);
        if (!isActive || searchQuery.length < 2) {
            setSuggestions([]);
            setDomainSuggestions([]);
            setSuggestionsOpen(false);
            setHighlightedIndex(-1);
            return;
        }

        const timeout = setTimeout(async () => {
            autocompleteAbortRef.current?.abort();
            const controller = new AbortController();
            autocompleteAbortRef.current = controller;
            try {
                const { data, error } = await autocomplete({
                    query: { q: searchQuery, limit: 8 },
                    signal: controller.signal,
                });
                if (error) return;
                const list: string[] = Array.isArray(data?.suggestions) ? data.suggestions : [];
                const domainList: DomainSuggestion[] = Array.isArray(data?.domains) ? data.domains : [];
                setSuggestions(list);
                setDomainSuggestions(domainList);
                if (list.length + domainList.length > 0) {
                    // Calculate dropdown position based on viewport space
                    if (wrapperRef.current) {
                        const rect = wrapperRef.current.getBoundingClientRect();
                        const spaceBelow = window.innerHeight - rect.bottom;
                        const spaceAbove = rect.top;
                        const dropdownHeight = Math.min(288, (list.length + domainList.length) * 36); // max-h-72 = 288px, ~36px per item

                        // On mobile (or when not enough space below), show above if there's more space
                        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                            setDropdownPosition('above');
                        } else {
                            setDropdownPosition('below');
                        }
                    }
                    setSuggestionsOpen(true);
                } else {
                    setSuggestionsOpen(false);
                }
                setHighlightedIndex(-1);
            } catch (err: any) {
                if (err?.name !== "AbortError") console.error("Autocomplete fetch failed", err);
            }
        }, 180);

        return () => clearTimeout(timeout);
    }, [message, isActive]);

    const getLastWords = (msg: string): { prefix: string; query: string } => {
        const trimmed = msg.trimEnd();
        if (!trimmed) return { prefix: '', query: '' };
        const words = trimmed.split(/\s+/);
        const take = Math.min(4, words.length);
        const query = words.slice(-take).join(' ');
        const prefix = words.length > take ? words.slice(0, -take).join(' ') + ' ' : '';
        return { prefix, query };
    };

    const selectSuggestion = (value: string) => {
        suppressNextFetchRef.current = true;
        const { prefix } = getLastWords(message);
        setMessage(prefix + value);
        setSuggestions([]);
        setDomainSuggestions([]);
        setSuggestionsOpen(false);
        setHighlightedIndex(-1);
        textareaRef.current?.focus();
    };

    // Selecting a domain suggestion navigates straight to the site instead of searching
    const goToDomain = (d: DomainSuggestion) => {
        setSuggestionsOpen(false);
        setHighlightedIndex(-1);
        window.location.href = `https://${d.domain}`;
    };

    // Domain suggestions render first, followed by text suggestions;
    // highlightedIndex spans the combined list.
    const totalOptions = domainSuggestions.length + suggestions.length;
    const chooseOption = (index: number) => {
        if (index < domainSuggestions.length) goToDomain(domainSuggestions[index]);
        else selectSuggestion(suggestions[index - domainSuggestions.length]);
    };

    useEffect(() => {
        if (isActive || message) return;
        const interval = setInterval(() => {
            setShowPlaceholder(false);
            setTimeout(() => {
                setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
                setShowPlaceholder(true);
            }, 400);
        }, 3000);
        return () => clearInterval(interval);
    }, [isActive, message]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                if (!message) setIsActive(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [message]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 384) + "px";
        }
    }, [message]);

    const handleSend = () => {
        if (loading) return;
        if (!message.trim() && files.length === 0 && pastedContent.length === 0) return;
        sendMessage(message);
        resetInput();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (suggestionsOpen && totalOptions > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex(i => (i + 1) % totalOptions);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex(i => (i <= 0 ? totalOptions - 1 : i - 1));
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setSuggestionsOpen(false);
                setHighlightedIndex(-1);
                return;
            }
            if (e.key === 'Tab' && highlightedIndex >= 0) {
                e.preventDefault();
                chooseOption(highlightedIndex);
                return;
            }
            if (e.key === 'Enter' && !e.shiftKey && highlightedIndex >= 0) {
                e.preventDefault();
                chooseOption(highlightedIndex);
                return;
            }
            const numKey = parseInt(e.key, 10);
            if (numKey >= 1 && numKey <= totalOptions && numKey <= 9) {
                e.preventDefault();
                chooseOption(numKey - 1);
                return;
            }
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const hasContent = !!(message.trim() || files.length > 0 || pastedContent.length > 0);

    return (
        <div
            className="relative w-full max-w-2xl mx-auto transition-all duration-300 font-sans"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <motion.div
                ref={wrapperRef}
                className="!box-content flex flex-col mx-2 md:mx-0 items-stretch relative z-10 rounded-[28px] bg-gray-50 dark:bg-[#30302E] border border-bg-300 dark:border-transparent cursor-text font-sans antialiased"
                animate={{
                    boxShadow: isActive || !!message
                        ? "0 8px 32px 0 rgba(0,0,0,0.16)"
                        : "0 2px 8px 0 rgba(0,0,0,0.08)",
                }}
                transition={{ type: "spring", stiffness: 120, damping: 18 }}
                onClick={() => setIsActive(true)}
            >
                {/* Attachments */}
                {(files.length > 0 || pastedContent.length > 0) && (
                    <div className="flex gap-3 overflow-x-auto custom-scrollbar px-3 pt-3 pb-1">
                        {pastedContent.map(content => (
                            <PastedContentCard
                                key={content.id}
                                content={content}
                                onRemove={id => setPastedContent(prev => prev.filter(c => c.id !== id))}
                            />
                        ))}
                        {files.map(file => (
                            <FilePreviewCard
                                key={file.id}
                                file={file}
                                onRemove={id => setFiles(prev => prev.filter(f => f.id !== id))}
                            />
                        ))}
                    </div>
                )}

                {/* Waveform */}
                {isListening && (
                    <div className="px-3 pt-2">
                        <LiveWaveform
                            active={isListening}
                            mode="static"
                            height={48}
                            barWidth={3}
                            barGap={2}
                            barColor="gray"
                            fadeEdges={true}
                            sensitivity={1.2}
                            className="w-full rounded-lg"
                        />
                    </div>
                )}

                {/* Input Row */}
                <div className="flex items-center gap-2 p-3">
                    {/* Settings dropdown + Paperclip (from FileUploadDropdown) */}
                    <FileUploadDropdown
                        onFileSelect={handleFiles}
                        disabled={loading}
                    />

                    {/* Textarea with animated placeholder */}
                    <div className="relative flex-1">
                        <div className="max-h-96 w-full overflow-y-auto custom-scrollbar">
                            <textarea
                                ref={textareaRef}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onPaste={handlePaste}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setIsActive(true)}
                                className="w-full bg-transparent border-0 outline-none text-text-200 dark:text-text-100 text-[16px] resize-none overflow-hidden py-1 leading-relaxed block font-normal antialiased"
                                rows={1}
                                autoFocus
                                style={{ minHeight: "1.5em" }}
                            />
                        </div>
                        {/* Animated placeholder overlay */}
                        <div className="absolute left-0 top-0 w-full h-full pointer-events-none flex items-center">
                            <AnimatePresence mode="wait">
                                {showPlaceholder && !isActive && !message && (
                                    <motion.span
                                        key={placeholderIndex}
                                        className="absolute left-0 top-1/2 -translate-y-1/2 text-text-400 select-none pointer-events-none text-[16px] font-normal"
                                        style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                        variants={placeholderContainerVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                    >
                                        {PLACEHOLDERS[placeholderIndex].split("").map((char, i) => (
                                            <motion.span key={i} variants={letterVariants} style={{ display: "inline-block" }}>
                                                {char === " " ? " " : char}
                                            </motion.span>
                                        ))}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Mic */}
                    {isSpeechSupported && (
                        <div className="relative flex shrink !shrink-0 group">
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleSpeech(); }}
                                disabled={loading}
                                className={`transition-all duration-200 h-8 w-8 flex items-center justify-center rounded-full active:scale-95
                                    ${isListening
                                        ? 'text-red-500 bg-red-500/10 animate-pulse'
                                        : 'text-text-400 hover:text-text-200 hover:bg-bg-200'}
                                `}
                                aria-label={isListening ? "Stop listening" : "Voice input"}
                            >
                                <Icons.Mic className="w-5 h-5" />
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1F1E1D] dark:bg-[#EEEEEC] text-[11px] font-medium rounded-[6px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-sm tracking-wide">
                                <span className="text-[#ECECEC] dark:text-[#1F1E1D]">{isListening ? "Stop listening" : "Voice input"}</span>
                            </div>
                        </div>
                    )}

                    {/* New Chat - only show when there are messages */}
                    {sections.length > 0 && (
                        <div className="relative flex shrink !shrink-0 group">
                            <button
                                onClick={(e) => { e.stopPropagation(); newChat(); }}
                                disabled={loading}
                                className="transition-all duration-200 h-8 w-8 flex items-center justify-center rounded-full active:scale-95 text-text-400 hover:text-text-200 hover:bg-bg-200"
                                aria-label="New chat"
                            >
                                <Icons.SquarePen className="w-5 h-5" />
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1F1E1D] dark:bg-[#EEEEEC] text-[11px] font-medium rounded-[6px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-sm tracking-wide">
                                <span className="text-[#ECECEC] dark:text-[#1F1E1D]">New chat</span>
                            </div>
                        </div>
                    )}

                    {/* Send / Stop */}
                    <div className="relative flex shrink !shrink-0 group">
                        {loading ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); stopStreaming(); }}
                                className="inline-flex items-center justify-center shrink-0 transition-colors h-8 w-8 rounded-full active:scale-95 bg-red-500 text-white hover:bg-red-600 shadow-md"
                                type="button"
                                aria-label="Stop generating"
                            >
                                <Icons.Stop className="w-3.5 h-3.5 fill-current" />
                            </button>
                        ) : (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleSend(); }}
                                disabled={!hasContent}
                                className={`inline-flex items-center justify-center shrink-0 transition-all duration-200 h-8 w-8 rounded-full active:scale-95
                                    ${hasContent
                                        ? 'bg-accent text-bg-0 hover:bg-accent-hover shadow-md'
                                        : 'bg-bg-300 text-text-400 cursor-default opacity-50'}
                                `}
                                type="button"
                                aria-label="Send message"
                            >
                                <Icons.ArrowUp className="w-4 h-4" />
                            </button>
                        )}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1F1E1D] dark:bg-[#EEEEEC] text-[11px] font-medium rounded-[6px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-sm tracking-wide">
                            <span className="text-[#ECECEC] dark:text-[#1F1E1D]">{loading ? "Stop generating" : "Send message"}</span>
                        </div>
                    </div>
                </div>

            </motion.div>

            {/* Autocomplete Dropdown */}
            <AnimatePresence>
                {suggestionsOpen && totalOptions > 0 && (
                    <motion.div
                        ref={(node) => {
                            if (node && wrapperRef.current && !wrapperRef.current.contains(node)) {
                                // no-op; rendered outside wrapper, handled by mousedown stopPropagation below
                            }
                        }}
                        initial={{ opacity: 0, y: dropdownPosition === 'above' ? 4 : -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: dropdownPosition === 'above' ? 4 : -4 }}
                        transition={{ duration: 0.12 }}
                        className={`absolute left-2 right-2 md:left-0 md:right-0 z-20 rounded-2xl bg-gray-50 dark:bg-[#30302E] border border-bg-300 dark:border-transparent shadow-xl overflow-hidden ${
                            dropdownPosition === 'above'
                                ? 'bottom-full'
                                : 'top-full'
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <ul className="max-h-72 overflow-y-auto custom-scrollbar py-1">
                            {domainSuggestions.map((d, i) => (
                                <li key={`domain-${d.domain}`}>
                                    <button
                                        type="button"
                                        onMouseEnter={() => setHighlightedIndex(i)}
                                        onClick={() => goToDomain(d)}
                                        className={`w-full text-left px-4 py-1.5 text-[15px] flex items-center gap-3 transition-colors ${
                                            i === highlightedIndex
                                                ? 'bg-bg-200 text-text-100'
                                                : 'text-text-200 hover:bg-bg-100 dark:hover:bg-[#3A3A38]'
                                        }`}
                                    >
                                        <span className="w-5 h-5 flex items-center justify-center rounded bg-bg-200 dark:bg-[#3A3A38] text-[11px] font-semibold text-text-400 shrink-0">{i + 1}</span>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={d.favicon} alt="" className="w-4 h-4 rounded-sm shrink-0" />
                                        <span className="truncate font-medium">{d.name || d.domain}</span>
                                        <span className="truncate text-[13px] text-text-400 shrink-0">{d.domain}</span>
                                        {Number.isFinite(d.rank) && d.rank < Number.MAX_SAFE_INTEGER && (
                                            <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums bg-bg-200 dark:bg-[#3A3A38] text-text-400">
                                                #{d.rank.toLocaleString()}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            ))}
                            {suggestions.map((s, i) => {
                                const optionIndex = domainSuggestions.length + i;
                                return (
                                    <li key={`${s}-${i}`}>
                                        <button
                                            type="button"
                                            onMouseEnter={() => setHighlightedIndex(optionIndex)}
                                            onClick={() => selectSuggestion(s)}
                                            className={`w-full text-left px-4 py-1.5 text-[15px] flex items-center gap-3 transition-colors ${
                                                optionIndex === highlightedIndex
                                                    ? 'bg-bg-200 text-text-100'
                                                    : 'text-text-200 hover:bg-bg-100 dark:hover:bg-[#3A3A38]'
                                            }`}
                                        >
                                            <span className="w-5 h-5 flex items-center justify-center rounded bg-bg-200 dark:bg-[#3A3A38] text-[11px] font-semibold text-text-400 shrink-0">{optionIndex + 1}</span>
                                            <Search className="w-4 h-4 text-text-400 shrink-0" />
                                            <span className="truncate">{s}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Drag Overlay */}
            {isDragging && (
                <div className="absolute inset-0 bg-bg-200/90 border-2 border-dashed border-accent rounded-[28px] z-50 flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none">
                    <Icons.Archive className="w-10 h-10 text-accent mb-2 animate-bounce" />
                    <p className="text-accent font-medium">Drop files to upload</p>
                </div>
            )}
        </div>
    );
};

export default ChatInputBox;
