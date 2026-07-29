/**
 * @fileoverview Re-exports ChatProvider, useChat hook, chatContext, and shared types from the chat module index.
 */
'use client';

// Re-export everything from the chat module
export { ChatProvider, useChat, chatContext } from '.';
export type { ChatContextValue as ChatContext } from '.';
export type { Section, ChatFile as File } from '.';
