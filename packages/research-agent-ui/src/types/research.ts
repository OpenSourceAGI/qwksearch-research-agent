/**
 * Type definitions used by the ResearchAgent area of the ResearchAgent feature.
 */
import { ChatFile, ChatModelProvider } from "./chat";

export type { ChatModelProvider };

export interface Article {
  html?: string;
  cite?: string;
  title?: string;
  url?: string;
  author?: string;
  author_cite?: string;
  author_short?: string;
  author_type?: string;
  date?: string;
  source?: string;
  word_count?: number;
  followUpQuestions?: string[];
  qaHistory?: Array<{ question: string; answer: string }>;
}

export type SearchCategory =
  | "general"
  | "news"
  | "videos"
  | "images"
  | "science"
  | "tech"
  | "files";

export interface CategoryTab {
  code: SearchCategory;
  name: string;
  icon: string;
}

export interface SearchParams {
  q: string;
  cat: SearchCategory;
  page: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  score: number;
  date?: string;
  source?: string;
  domain?: string;
  favicon?: string;
  thumbnail?: string;
  content?: string;
  img_src?: string;
  iframe_src?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  time: string;
}

export interface ArticleExtractPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  url?: string;
  searchText?: string;
}

export interface AttachedFile {
  id: string;
  file: File;
  type: string;
  preview: string | null;
  uploadStatus: string;
  content?: string;
}

export interface PastedContent {
  id: string;
  content: string;
  timestamp: Date;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  focusMode: string;
  userId?: string | null;
  files?: ChatFile[];
  messageCount?: number;
}
