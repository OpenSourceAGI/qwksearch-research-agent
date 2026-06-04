type ChatHistoryMessage = {
  content?: unknown;
  role?: string;
  type?: string;
};

export const formatChatHistoryAsString = (history: ChatHistoryMessage[]) => {
  return history
    .map(
      (message) =>
        `${message.role === 'assistant' || message.type === 'ai' ? 'AI' : 'User'}: ${String(message.content ?? '')}`,
    )
    .join('\n');
};
