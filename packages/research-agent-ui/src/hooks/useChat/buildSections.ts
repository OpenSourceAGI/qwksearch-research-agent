/**
 * @fileoverview Message parsing and section building for the chat UI.
 * Transforms raw message arrays into structured sections that group
 * user messages with their corresponding AI responses, sources, and suggestions.
 * @module components/ResearchAgent/state/chat/buildSections
 */

import {
  AssistantMessage,
  Message,
  SearchingMessage,
  SourceMessage,
  SuggestionMessage,
  UserMessage,
} from "../../components/ChatConversation/ChatWindow";
import { Section } from "../../types/chat";

/**
 * Transforms a flat array of messages into structured UI sections.
 *
 * Each section groups together:
 * - A user message
 * - The corresponding AI assistant response
 * - Source citations used for the response
 * - Follow-up suggestions
 *
 * The function also performs message processing:
 * - Converts citation markers `[1]`, `[2,3]` into clickable `<citation>` elements
 * - Handles thinking/reasoning tags (`<think>...</think>`)
 * - Creates a speech-friendly version with citations removed
 *
 * @param messages - Array of all chat messages (user, assistant, source, suggestion)
 * @returns Array of Section objects for rendering in the UI
 *
 * @example
 * ```typescript
 * const sections = buildSections(messages);
 *
 * //     userMessage: { role: 'user', content: 'What is React?' },
 * //     assistantMessage: { role: 'assistant', content: 'React is...' },
 * //     parsedAssistantMessage: 'React is... <citation href="...">1</citation>',
 * //     speechMessage: 'React is...',
 * //     sourceMessage: { sources: [...] },
 * //     thinkingEnded: true,
 * //     suggestions: ['How does React compare to Vue?', ...]
 * ```
 */
export const buildSections = (messages: Message[]): Section[] => {
  const sections: Section[] = [];

  messages.forEach((msg, i) => {
    // Only create sections starting from user messages
    if (msg.role === "user") {
      // Find the boundary of this conversation turn (next user message)
      const nextUserMessageIndex = messages.findIndex(
        (m, j) => j > i && m.role === "user",
      );

      // Find the assistant response within this turn
      const aiMessage = messages.find(
        (m, j) =>
          j > i &&
          m.role === "assistant" &&
          (nextUserMessageIndex === -1 || j < nextUserMessageIndex),
      ) as AssistantMessage | undefined;

      // Find the sources within this turn
      const sourceMessage = messages.find(
        (m, j) =>
          j > i &&
          m.role === "source" &&
          m.sources &&
          (nextUserMessageIndex === -1 || j < nextUserMessageIndex),
      ) as SourceMessage | undefined;

      // Find the searching progress message within this turn
      const searchingMessage = messages.find(
        (m, j) =>
          j > i &&
          m.role === "searching" &&
          (nextUserMessageIndex === -1 || j < nextUserMessageIndex),
      ) as SearchingMessage | undefined;

      let thinkingEnded = false;
      let processedMessage = aiMessage?.content ?? "";
      let speechMessage = aiMessage?.content ?? "";
      let suggestions: string[] = [];

      if (aiMessage) {
        // Regex patterns for citation processing
        const citationRegex = /\[([^\]]+)\]/g;
        const regex = /\[(\d+)\]/g;

        // Handle incomplete thinking tags (streaming in progress)
        if (processedMessage.includes("<think>")) {
          const openThinkTag = processedMessage.match(/<think>/g)?.length || 0;
          const closeThinkTag =
            processedMessage.match(/<\/think>/g)?.length || 0;

          // Add closing tag if thinking is still in progress
          if (openThinkTag && !closeThinkTag) {
            processedMessage += "</think> <a> </a>";
          }
        }

        // Check if thinking phase has completed
        if (aiMessage.content.includes("</think>")) {
          thinkingEnded = true;
        }

        // Process citations if sources are available
        if (
          sourceMessage &&
          sourceMessage.sources &&
          sourceMessage.sources.length > 0
        ) {
          // Convert [1], [2,3] notation to <citation> elements
          processedMessage = processedMessage.replace(
            citationRegex,
            (_, capturedContent: string) => {
              const numbers = capturedContent
                .split(",")
                .map((numStr) => numStr.trim());

              const linksHtml = numbers
                .map((numStr) => {
                  const number = parseInt(numStr);

                  // Keep non-numeric brackets as-is
                  if (isNaN(number) || number <= 0) {
                    return `[${numStr}]`;
                  }

                  // Look up the source URL (1-indexed)
                  const source = sourceMessage.sources?.[number - 1];
                  const url = source?.metadata?.url;

                  if (url) {
                    return `<citation href="${url}">${numStr}</citation>`;
                  } else {
                    return ``;
                  }
                })
                .join("");

              return linksHtml;
            },
          );
          // Remove citations from speech version
          speechMessage = aiMessage.content.replace(regex, "");
        } else {
          // No sources - just remove citation markers
          processedMessage = processedMessage.replace(regex, "");
          speechMessage = aiMessage.content.replace(regex, "");
        }

        // Find suggestions within this turn
        const suggestionMessage = messages.find(
          (m, j) =>
            j > i &&
            m.role === "suggestion" &&
            (nextUserMessageIndex === -1 || j < nextUserMessageIndex),
        ) as SuggestionMessage | undefined;

        if (suggestionMessage && suggestionMessage.suggestions.length > 0) {
          suggestions = suggestionMessage.suggestions;
        }
      }

      // Build the section object
      sections.push({
        userMessage: msg as UserMessage,
        assistantMessage: aiMessage,
        sourceMessage: sourceMessage,
        searchingMessage: searchingMessage,
        parsedAssistantMessage: processedMessage,
        speechMessage,
        thinkingEnded,
        suggestions: suggestions,
      });
    }
  });

  return sections;
};
