export interface Model {
  key: string;
  name: string;
}

export interface Provider {
  id: string;
  name: string;
  chatModels: Model[];
}

export interface ChatModelSelection {
  key: string;
  providerId: string;
}

export interface SourceItem {
  pageContent?: string;
  metadata?: { url?: string; title?: string };
}

export type ChatMessage =
  | { role: "user"; messageId: string; content: string }
  | { role: "assistant"; messageId: string; content: string }
  | { role: "source"; messageId: string; sources: SourceItem[] }
  | {
      role: "searching";
      messageId: string;
      queries: { query: string; status: "running" | "done" }[];
    }
  | { role: "error"; messageId: string; content: string };
