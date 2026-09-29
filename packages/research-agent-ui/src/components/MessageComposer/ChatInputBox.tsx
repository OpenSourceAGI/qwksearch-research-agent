/**
 * @fileoverview Primary animated chat input box for the composer.
 *
 * Renders a cycling animated placeholder, drag-and-drop and paste file handling, a voice-input waveform,
 * and an attachment tray for files and pasted content. Query autocomplete and its dropdown come from
 * `search-autocomplete/react`.
 */
"use client"

import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AutocompleteDropdown, useAutocomplete, type FetchSuggestions } from "search-autocomplete/react";
import { Icons } from "./MessageInputIconSet";
import { FilePreviewCard } from "../FileUpload/FilePreviewCard";
import { PastedContentCard } from "./PastedContentCard";
import { useChat } from '../../hooks/useChat';
import { useSpeechInput } from '../../hooks/voice/useSpeechToTranscript';
import { useVoiceAutoStart } from '../../hooks/voice/useVoiceAutoStart';
import { SpokenPhraseOverlay } from 'use-voice-control/react';
import { useFileHandling } from '../FileUpload/useFileHandling';
import FileUploadDropdown from '../FileUpload/FileUploadDropdown';
import { LiveWaveform } from '../../ui/live-waveform';
import { autocomplete } from 'qwksearch-api-client';

// Through the generated client rather than the hook's default fetch, so the
// request honours the client's configured base URL (the extensions and the
// desktop app call a remote host, not a relative path).
const fetchSuggestions: FetchSuggestions = async (q, { signal, limit }) => {
    const { data, error } = await autocomplete({ query: { q, limit }, signal });
    return error ? null : { suggestions: data?.suggestions ?? [], domains: data?.domains ?? [] };
};

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

    // Text the input held before the phrase currently being dictated. Each
    // recognizer update rewrites only what comes after it, so the in-progress
    // words appear (and correct themselves) live without eating what was typed
    // or dictated earlier.
    const dictationBaseRef = useRef("");

    const appendToBase = (base: string, phrase: string) =>
        base && !/\s$/.test(base) ? `${base} ${phrase}` : `${base}${phrase}`;

    const { isListening, toggleSpeech, isSpeechSupported, lastPhrase, phraseId } = useSpeechInput(
        (phrase) => {
            // A settled phrase becomes part of the base, so the next one lands
            // after it rather than replacing it.
            setMessage(() => {
                const next = `${appendToBase(dictationBaseRef.current, phrase)} `;
                dictationBaseRef.current = next;
                return next;
            });
        },
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
        },
        {
            onPartial: (text) =>
                setMessage(text ? appendToBase(dictationBaseRef.current, text) : dictationBaseRef.current),
        }
    );

    // Anything already in the box when the mic opens is kept and dictated onto.
    useEffect(() => {
        if (isListening) dictationBaseRef.current = message;
        // Only when listening starts — `message` changes constantly while dictating.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isListening]);

    useVoiceAutoStart({ isSpeechSupported, isListening, toggleSpeech });

    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [showPlaceholder, setShowPlaceholder] = useState(true);
    const [isActive, setIsActive] = useState(false);
    const {
        handleKeyDown: handleAutocompleteKeyDown,
        ...autocompleteState
    } = useAutocomplete({
        value: message,
        onChange: setMessage,
        enabled: isActive,
        fetchSuggestions,
        anchorRef: wrapperRef,
        inputRef: textareaRef,
    });

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
        if (handleAutocompleteKeyDown(e)) return;
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

                {/* Echoes each dictated phrase in the middle of the screen, so what
                    was heard is readable without watching the input box. */}
                <SpokenPhraseOverlay
                    phrase={lastPhrase}
                    phraseId={phraseId}
                    visible={isListening}
                />

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
            <AutocompleteDropdown {...autocompleteState} />

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
